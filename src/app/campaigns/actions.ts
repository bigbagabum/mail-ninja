"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, campaigns, campaignVariants, campaignWaves, jobs } from "@/db/schema";
import { requireAdmin } from "@/server/auth/session";
import { enqueueJob } from "@/server/jobs/queue";
import { hasUnsubscribeLink } from "@/lib/templates";

const campaignSchema = z.object({
  name: z.string().min(1),
  campaignKey: z.string().regex(/^[a-z0-9][a-z0-9-]{1,80}$/),
  description: z.string().optional(),
  campaignType: z.enum(["service_update", "marketing", "newsletter", "announcement"]),
  defaultLocale: z.string().min(2),
  fromName: z.string().min(1),
  fromEmail: z.string().email(),
  replyTo: z.string().email().optional().or(z.literal(""))
});

export async function createCampaignAction(formData: FormData) {
  const admin = await requireAdmin();
  const data = campaignSchema.parse(Object.fromEntries(formData));
  const [campaign] = await db.insert(campaigns).values({ ...data, replyTo: data.replyTo || null, workspaceId: admin.workspaceId, createdBy: admin.id }).returning();
  await db.insert(auditLogs).values({ workspaceId: admin.workspaceId, adminUserId: admin.id, action: "campaign_creation", entityType: "campaign", entityId: campaign.id });
  redirect(`/campaigns/${campaign.id}`);
}

export async function updateCampaignAction(formData: FormData) {
  const admin = await requireAdmin();
  const campaignId = z.string().uuid().parse(formData.get("campaignId"));
  const data = campaignSchema.parse(Object.fromEntries(formData));
  const existing = await db.query.campaigns.findFirst({ where: eq(campaigns.id, campaignId) });
  if (!existing || existing.workspaceId !== admin.workspaceId) throw new Error("Campaign not found.");
  await db.transaction(async (tx) => {
    await tx
      .update(campaigns)
      .set({
        ...data,
        replyTo: data.replyTo || null,
        updatedAt: new Date(),
        metadata:
          existing.status === "draft"
            ? existing.metadata
            : { ...existing.metadata, preparationInvalidated: true, preparationInvalidatedAt: new Date().toISOString() }
      })
      .where(eq(campaigns.id, campaignId));
    await tx.insert(auditLogs).values({
      workspaceId: admin.workspaceId,
      adminUserId: admin.id,
      action: "campaign_update",
      entityType: "campaign",
      entityId: campaignId
    });
  });
  redirect(`/campaigns/${campaignId}/edit`);
}

const variantSchema = z.object({
  campaignId: z.string().uuid(),
  locale: z.string().min(2),
  recipientRole: z.string().default("generic"),
  name: z.string().min(1),
  subject: z.string().min(1),
  previewText: z.string().optional(),
  htmlContent: z.string().min(1),
  textContent: z.string().optional(),
  isFallback: z.coerce.boolean().optional()
});

export async function createVariantAction(formData: FormData) {
  await requireAdmin();
  const data = variantSchema.parse(Object.fromEntries(formData));
  await db.insert(campaignVariants).values({ ...data, isFallback: Boolean(data.isFallback) }).onConflictDoUpdate({
    target: [campaignVariants.campaignId, campaignVariants.locale, campaignVariants.recipientRole],
    set: { name: data.name, subject: data.subject, previewText: data.previewText, htmlContent: data.htmlContent, textContent: data.textContent, isFallback: Boolean(data.isFallback), updatedAt: new Date() }
  });
  redirect(`/campaigns/${data.campaignId}/variants`);
}

const waveSchema = z.object({
  campaignId: z.string().uuid(),
  name: z.string().min(1),
  position: z.coerce.number().int().positive(),
  recipientLimit: z.union([z.coerce.number().int().positive(), z.literal("")]).optional()
});

export async function createWaveAction(formData: FormData) {
  await requireAdmin();
  const data = waveSchema.parse(Object.fromEntries(formData));
  await db.insert(campaignWaves).values({ campaignId: data.campaignId, name: data.name, position: data.position, recipientLimit: data.recipientLimit === "" ? null : data.recipientLimit }).onConflictDoUpdate({
    target: [campaignWaves.campaignId, campaignWaves.position],
    set: { name: data.name, recipientLimit: data.recipientLimit === "" ? null : data.recipientLimit, updatedAt: new Date() }
  });
  redirect(`/campaigns/${data.campaignId}/waves`);
}

export async function prepareCampaignAction(formData: FormData) {
  const admin = await requireAdmin();
  const campaignId = z.string().uuid().parse(formData.get("campaignId"));
  await db.transaction(async (tx) => {
    const campaign = await tx.query.campaigns.findFirst({ where: eq(campaigns.id, campaignId) });
    if (!campaign) throw new Error("Campaign not found.");
    const variants = await tx.query.campaignVariants.findMany({ where: eq(campaignVariants.campaignId, campaignId) });
    if (!variants.some((variant) => variant.isFallback)) throw new Error("A fallback variant is required before preparation.");
    if (campaign.campaignType !== "service_update" && !variants.some((variant) => hasUnsubscribeLink(variant.htmlContent, variant.textContent))) {
      throw new Error("Marketing-style campaigns require an unsubscribe link.");
    }
    await tx.insert(jobs).values({ workspaceId: admin.workspaceId, type: "prepare_campaign", payload: { campaignId }, priority: 20 });
    await tx.insert(auditLogs).values({ workspaceId: admin.workspaceId, adminUserId: admin.id, action: "campaign_preparation", entityType: "campaign", entityId: campaignId });
  });
  redirect(`/campaigns/${campaignId}/recipients`);
}

export async function sendWaveAction(formData: FormData) {
  const admin = await requireAdmin();
  const waveId = z.string().uuid().parse(formData.get("waveId"));
  await enqueueJob({ workspaceId: admin.workspaceId, type: "send_provider_broadcast", payload: { waveId }, priority: 10 });
  redirect(`/jobs`);
}
