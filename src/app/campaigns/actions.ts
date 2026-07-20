"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  auditLogs,
  campaigns,
  campaignRecipients,
  campaignVariants,
  campaignWaves,
  jobs,
  recipients,
} from "@/db/schema";
import { requireAdmin } from "@/server/auth/session";
import { enqueueJob } from "@/server/jobs/queue";
import { prepareCampaign } from "@/server/campaigns/prepare";
import { buildCampaignRecipientFilters } from "@/server/campaigns/recipient-filters";
import { createProviderForWorkspace } from "@/server/provider/resend";
import {
  hasUnsubscribeLink,
  renderTemplate,
} from "@/lib/templates";
import { normalizeEmail } from "@/lib/normalization";

function slugifyCampaignKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 81);
}

const campaignSchema = z
  .object({
    name: z.string().min(1),
    campaignKey: z.string().optional(),
    description: z.string().optional(),
    campaignType: z.enum([
      "service_update",
      "marketing",
      "newsletter",
      "announcement",
    ]),
    defaultLocale: z.string().min(2),
    fromName: z.string().min(1),
    fromEmail: z.string().email(),
    replyTo: z.string().email().optional().or(z.literal("")),
  })
  .transform((data) => {
    const campaignKey = slugifyCampaignKey(data.campaignKey || data.name);
    if (!campaignKey) {
      throw new Error(
        "Campaign key must contain at least one letter or number.",
      );
    }
    return { ...data, campaignKey };
  });

export async function createCampaignAction(formData: FormData) {
  const admin = await requireAdmin();
  const data = campaignSchema.parse(Object.fromEntries(formData));
  const [campaign] = await db
    .insert(campaigns)
    .values({
      ...data,
      replyTo: data.replyTo || null,
      workspaceId: admin.workspaceId,
      createdBy: admin.id,
    })
    .returning();
  await db.insert(auditLogs).values({
    workspaceId: admin.workspaceId,
    adminUserId: admin.id,
    action: "campaign_creation",
    entityType: "campaign",
    entityId: campaign.id,
  });
  redirect(`/campaigns/${campaign.id}`);
}

export async function updateCampaignAction(formData: FormData) {
  const admin = await requireAdmin();
  const campaignId = z.string().uuid().parse(formData.get("campaignId"));
  const data = campaignSchema.parse(Object.fromEntries(formData));
  const filterBoolean = (name: string) => {
    const value = formData.get(name);
    if (value === "true") return true;
    if (value === "false") return false;
    return null;
  };
  const recipientFilters = buildCampaignRecipientFilters({
    tagSlugs: formData.getAll("tagSlugs"),
    locale: formData.get("filterLocale"),
    platform: formData.get("filterPlatform"),
    emailVerified: filterBoolean("filterEmailVerified"),
    marketingConsent: filterBoolean("filterMarketingConsent"),
  });
  const existing = await db.query.campaigns.findFirst({
    where: eq(campaigns.id, campaignId),
  });
  if (!existing || existing.workspaceId !== admin.workspaceId)
    throw new Error("Campaign not found.");
  await db.transaction(async (tx) => {
    await tx
      .update(campaigns)
      .set({
        ...data,
        replyTo: data.replyTo || null,
        updatedAt: new Date(),
        metadata:
          existing.status === "draft"
            ? { ...existing.metadata, recipientFilters }
            : {
                ...existing.metadata,
                recipientFilters,
                preparationInvalidated: true,
                preparationInvalidatedAt: new Date().toISOString(),
              },
      })
      .where(eq(campaigns.id, campaignId));
    await tx.insert(auditLogs).values({
      workspaceId: admin.workspaceId,
      adminUserId: admin.id,
      action: "campaign_update",
      entityType: "campaign",
      entityId: campaignId,
    });
  });
  redirect(`/campaigns/${campaignId}/edit`);
}

const waveSchema = z.object({
  campaignId: z.string().uuid(),
  name: z.string().min(1),
  position: z.coerce.number().int().positive(),
  recipientLimit: z
    .union([z.coerce.number().int().positive(), z.literal("")])
    .optional(),
});

export async function createWaveAction(formData: FormData) {
  await requireAdmin();
  const data = waveSchema.parse(Object.fromEntries(formData));
  await db
    .insert(campaignWaves)
    .values({
      campaignId: data.campaignId,
      name: data.name,
      position: data.position,
      recipientLimit: data.recipientLimit === "" ? null : data.recipientLimit,
    })
    .onConflictDoUpdate({
      target: [campaignWaves.campaignId, campaignWaves.position],
      set: {
        name: data.name,
        recipientLimit: data.recipientLimit === "" ? null : data.recipientLimit,
        updatedAt: new Date(),
      },
    });
  redirect(`/campaigns/${data.campaignId}/waves`);
}

export async function prepareCampaignAction(formData: FormData) {
  const campaignId = z.string().uuid().parse(formData.get("campaignId"));
  const result = await prepareCampaignByIdAction(campaignId);
  if (!result.ok) throw new Error(result.error);
  redirect(`/campaigns/${campaignId}/recipients`);
}

export async function prepareCampaignByIdAction(campaignId: string) {
  try {
    const admin = await requireAdmin();
    const parsedCampaignId = z.string().uuid().safeParse(campaignId);
    if (!parsedCampaignId.success)
      return { ok: false as const, error: "Invalid campaign ID." };
    const campaign = await db.query.campaigns.findFirst({
      where: eq(campaigns.id, parsedCampaignId.data),
    });
    if (!campaign || campaign.workspaceId !== admin.workspaceId) {
      return { ok: false as const, error: "Campaign not found." };
    }
    if (!["draft", "preparing"].includes(campaign.status)) {
      return {
        ok: false as const,
        error: `Campaign cannot be prepared while it is ${campaign.status}.`,
      };
    }
    const existingPrepared = await db.query.campaignRecipients.findFirst({
      where: eq(campaignRecipients.campaignId, parsedCampaignId.data),
    });
    if (existingPrepared) {
      return {
        ok: true as const,
        message: "Campaign already has prepared recipients.",
      };
    }
    const variants = await db.query.campaignVariants.findMany({
      where: eq(campaignVariants.campaignId, parsedCampaignId.data),
    });
    if (variants.length === 0) {
      return {
        ok: false as const,
        error:
          "Create or choose at least one email template before preparation.",
      };
    }
    if (
      campaign.campaignType !== "service_update" &&
      !variants.some((variant) =>
        hasUnsubscribeLink(variant.htmlContent, variant.textContent),
      )
    ) {
      return {
        ok: false as const,
        error:
          "Marketing, newsletter and announcement campaigns require an unsubscribe link.",
      };
    }
    const wave = await db.query.campaignWaves.findFirst({
      where: eq(campaignWaves.campaignId, parsedCampaignId.data),
    });
    if (!wave) {
      return {
        ok: false as const,
        error: "Add at least one campaign wave before preparation.",
      };
    }
    const recipient = await db.query.recipients.findFirst({
      where: eq(recipients.workspaceId, admin.workspaceId),
    });
    if (!recipient) {
      return {
        ok: false as const,
        error: "Add or import recipients before preparing a campaign.",
      };
    }
    const { preparedCount } = await prepareCampaign(parsedCampaignId.data);
    await db.insert(auditLogs).values({
      workspaceId: admin.workspaceId,
      adminUserId: admin.id,
      action: "campaign_preparation",
      entityType: "campaign",
      entityId: parsedCampaignId.data,
      metadata: { mode: "inline", preparedCount },
    });
    return {
      ok: true as const,
      message: `Campaign prepared with ${preparedCount} recipients.`,
    };
  } catch (caught) {
    const message =
      caught instanceof Error ? caught.message : "Campaign preparation failed.";
    return { ok: false as const, error: message };
  }
}

export async function sendWaveAction(formData: FormData) {
  const admin = await requireAdmin();
  const waveId = z.string().uuid().parse(formData.get("waveId"));
  await enqueueJob({
    workspaceId: admin.workspaceId,
    type: "send_provider_broadcast",
    payload: { waveId },
    priority: 10,
  });
  redirect(`/jobs`);
}

const launchCampaignSchema = z.object({
  campaignId: z.string().uuid(),
  sendMode: z.enum(["now", "scheduled"]),
  scheduledAt: z.string().optional(),
});

function parseUtcSchedule(value: string | undefined) {
  if (!value) throw new Error("Choose a UTC date and time.");
  const scheduledAt = new Date(`${value}:00.000Z`);
  if (Number.isNaN(scheduledAt.getTime())) {
    throw new Error("Scheduled date is invalid.");
  }
  return scheduledAt;
}

export async function launchCampaignAction(formData: FormData) {
  const admin = await requireAdmin();
  const data = launchCampaignSchema.parse(Object.fromEntries(formData));
  const campaign = await db.query.campaigns.findFirst({
    where: eq(campaigns.id, data.campaignId),
  });
  if (!campaign || campaign.workspaceId !== admin.workspaceId) {
    throw new Error("Campaign not found.");
  }
  if (campaign.status !== "ready") {
    throw new Error("Prepare the campaign before sending.");
  }
  const waves = await db.query.campaignWaves.findMany({
    where: eq(campaignWaves.campaignId, data.campaignId),
    orderBy: (table, { asc }) => [asc(table.position)],
  });
  if (waves.length === 0) throw new Error("Add at least one campaign wave.");

  const runAfter =
    data.sendMode === "scheduled"
      ? parseUtcSchedule(data.scheduledAt)
      : new Date();
  const now = new Date();
  if (data.sendMode === "scheduled" && runAfter <= now) {
    throw new Error("Scheduled time must be in the future.");
  }

  await db.transaction(async (tx) => {
    const [launched] = await tx
      .update(campaigns)
      .set({
        status: "sending",
        scheduledAt: runAfter,
        startedAt: data.sendMode === "now" ? now : null,
        updatedAt: now,
      })
      .where(
        and(eq(campaigns.id, data.campaignId), eq(campaigns.status, "ready")),
      )
      .returning({ id: campaigns.id });
    if (!launched) throw new Error("Campaign has already been launched.");
    for (const wave of waves) {
      const scheduledAt = new Date(
        runAfter.getTime() + (wave.position - 1) * 60_000,
      );
      await tx
        .update(campaignWaves)
        .set({
          status: data.sendMode === "now" ? "sending" : "ready",
          scheduledAt,
          startedAt: data.sendMode === "now" ? now : null,
          updatedAt: now,
        })
        .where(eq(campaignWaves.id, wave.id));
      await tx.insert(auditLogs).values({
        workspaceId: admin.workspaceId,
        adminUserId: admin.id,
        action: "campaign_send_queued",
        entityType: "campaign_wave",
        entityId: wave.id,
        metadata: {
          campaignId: data.campaignId,
          scheduledAt: scheduledAt.toISOString(),
        },
      });
      await tx.insert(jobs).values({
        workspaceId: admin.workspaceId,
        type: "send_provider_broadcast",
        payload: { campaignId: data.campaignId, waveId: wave.id },
        priority: 10 + wave.position,
        runAfter: scheduledAt,
      });
    }
    await tx.insert(auditLogs).values({
      workspaceId: admin.workspaceId,
      adminUserId: admin.id,
      action: "campaign_launch",
      entityType: "campaign",
      entityId: data.campaignId,
      metadata: {
        mode: data.sendMode,
        scheduledAt: runAfter.toISOString(),
        waveCount: waves.length,
      },
    });
  });
  redirect(`/jobs`);
}

const testEmailSchema = z.object({
  campaignId: z.string().uuid(),
  testEmail: z.string().email(),
});

export async function sendCampaignTestEmailAction(formData: FormData) {
  const admin = await requireAdmin();
  const data = testEmailSchema.parse(Object.fromEntries(formData));
  const campaign = await db.query.campaigns.findFirst({
    where: eq(campaigns.id, data.campaignId),
  });
  if (!campaign || campaign.workspaceId !== admin.workspaceId) {
    throw new Error("Campaign not found.");
  }
  const variant = await db.query.campaignVariants.findFirst({
    where: eq(campaignVariants.campaignId, data.campaignId),
    orderBy: (table, { asc }) => [asc(table.createdAt), asc(table.id)],
  });
  if (!variant)
    throw new Error("Create an email template before sending a test.");

  const testRecipient = {
    first_name: "Test",
    last_name: "Recipient",
    email: normalizeEmail(data.testEmail),
    locale: campaign.defaultLocale,
    role: "tester",
    platform: "test",
    external_id: "test-recipient",
    campaign_name: campaign.name,
    unsubscribe_url: "https://example.com/unsubscribe/test",
  };
  const { provider } = await createProviderForWorkspace(admin.workspaceId);
  await provider.sendTestEmail({
    from: `${campaign.fromName} <${campaign.fromEmail}>`,
    to: [normalizeEmail(data.testEmail)],
    subject: renderTemplate(variant.subject, testRecipient),
    html: renderTemplate(variant.htmlContent, testRecipient),
    text: variant.textContent
      ? renderTemplate(variant.textContent, testRecipient)
      : null,
  });
  await db.insert(auditLogs).values({
    workspaceId: admin.workspaceId,
    adminUserId: admin.id,
    action: "campaign_test_email",
    entityType: "campaign",
    entityId: data.campaignId,
    metadata: { to: normalizeEmail(data.testEmail), variantId: variant.id },
  });
  redirect(`/campaigns/${data.campaignId}/send`);
}
