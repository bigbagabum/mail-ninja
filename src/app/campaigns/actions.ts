"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  auditLogs,
  campaigns,
  campaignRecipients,
  campaignVariants,
  campaignWaves,
  recipients,
} from "@/db/schema";
import { requireAdmin } from "@/server/auth/session";
import { enqueueJob } from "@/server/jobs/queue";
import { prepareCampaign } from "@/server/campaigns/prepare";
import { buildCampaignRecipientFilters } from "@/server/campaigns/recipient-filters";
import { hasUnsubscribeLink, htmlToPlainText } from "@/lib/templates";

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

const variantSchema = z
  .object({
    campaignId: z.string().uuid(),
    locale: z.string().min(2),
    recipientRole: z.string().default("generic"),
    name: z.string().min(1),
    subject: z.string().min(1),
    previewText: z.string().optional(),
    htmlContent: z.string().min(1),
    textContent: z.string().optional(),
    isFallback: z.coerce.boolean().optional(),
  })
  .transform((data) => ({
    ...data,
    textContent: data.textContent?.trim() || htmlToPlainText(data.htmlContent),
  }));

export async function createVariantAction(formData: FormData) {
  await requireAdmin();
  const data = variantSchema.parse(Object.fromEntries(formData));
  await db
    .insert(campaignVariants)
    .values({ ...data, isFallback: Boolean(data.isFallback) })
    .onConflictDoUpdate({
      target: [
        campaignVariants.campaignId,
        campaignVariants.locale,
        campaignVariants.recipientRole,
      ],
      set: {
        name: data.name,
        subject: data.subject,
        previewText: data.previewText,
        htmlContent: data.htmlContent,
        textContent: data.textContent,
        isFallback: Boolean(data.isFallback),
        updatedAt: new Date(),
      },
    });
  redirect(`/campaigns/${data.campaignId}/variants`);
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
