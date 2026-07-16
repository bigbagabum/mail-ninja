import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { campaignAnalytics, campaignRecipients, campaigns, campaignVariants, campaignWaves, recipients, suppressions } from "@/db/schema";
import { logger } from "@/lib/logger";
import { resolveVariant } from "@/server/campaigns/variants";
import { assignWave } from "@/server/campaigns/waves";
import { processEmailEvent } from "@/server/webhooks/events";

export async function prepareCampaign(campaignId: string) {
  const campaign = await db.query.campaigns.findFirst({ where: eq(campaigns.id, campaignId) });
  if (!campaign) throw new Error("Campaign not found.");
  if (campaign.status !== "draft" && campaign.status !== "preparing") throw new Error("Only draft campaigns can be prepared.");
  const variants = await db.query.campaignVariants.findMany({ where: eq(campaignVariants.campaignId, campaignId) });
  const waves = await db.query.campaignWaves.findMany({ where: eq(campaignWaves.campaignId, campaignId), orderBy: (table, { asc }) => [asc(table.position)] });
  if (!variants.some((variant) => variant.isFallback)) throw new Error("Fallback variant is required.");
  if (waves.length === 0) throw new Error("At least one wave is required.");
  const selected = await db.query.recipients.findMany({ where: eq(recipients.workspaceId, campaign.workspaceId), orderBy: (table, { asc, desc }) => [desc(table.priorityScore), asc(table.id)] });
  const suppressionRows = await db.query.suppressions.findMany({ where: and(eq(suppressions.workspaceId, campaign.workspaceId), isNull(suppressions.expiresAt)) });
  const suppressionSet = new Set(suppressionRows.map((row) => row.normalizedEmail));
  await db.transaction(async (tx) => {
    await tx.update(campaigns).set({ status: "preparing", updatedAt: new Date() }).where(eq(campaigns.id, campaignId));
    let index = 0;
    for (const recipient of selected) {
      if (suppressionSet.has(recipient.normalizedEmail)) {
        continue;
      }
      const variant = resolveVariant(variants, { locale: recipient.locale, role: recipient.role, defaultLocale: campaign.defaultLocale });
      if (!variant) throw new Error(`No variant for recipient ${recipient.id}`);
      const waveId = assignWave(index, waves);
      index += 1;
      if (!waveId) throw new Error("Wave assignment failed.");
      await tx.insert(campaignRecipients).values({ campaignId, recipientId: recipient.id, variantId: variant.id, waveId, status: "prepared", preparedAt: new Date() }).onConflictDoNothing();
    }
    await tx.update(campaignWaves).set({ status: "ready", updatedAt: new Date() }).where(eq(campaignWaves.campaignId, campaignId));
    await tx.update(campaigns).set({ status: "ready", preparedAt: new Date(), updatedAt: new Date() }).where(eq(campaigns.id, campaignId));
  });
  logger.info("campaign prepared", { campaign_id: campaignId });
}

export async function recalculateCampaignAnalytics(campaignId: string) {
  const rows = await db.query.campaignRecipients.findMany({ where: eq(campaignRecipients.campaignId, campaignId) });
  const counts = {
    selectedCount: rows.length,
    preparedCount: rows.filter((row) => row.preparedAt).length,
    sentCount: rows.filter((row) => row.sentAt).length,
    deliveredCount: rows.filter((row) => row.deliveredAt).length,
    uniqueOpenedCount: rows.filter((row) => row.firstOpenedAt).length,
    totalOpenCount: rows.reduce((sum, row) => sum + row.openCount, 0),
    uniqueClickedCount: rows.filter((row) => row.firstClickedAt).length,
    totalClickCount: rows.reduce((sum, row) => sum + row.clickCount, 0),
    delayedCount: rows.filter((row) => row.deliveryDelayedAt).length,
    bouncedCount: rows.filter((row) => row.bouncedAt).length,
    complainedCount: rows.filter((row) => row.complainedAt).length,
    unsubscribedCount: rows.filter((row) => row.unsubscribedAt).length,
    suppressedCount: rows.filter((row) => row.suppressedAt).length,
    failedCount: rows.filter((row) => row.failedAt).length
  };
  await db.insert(campaignAnalytics).values({ campaignId, dimensionType: "overall", dimensionValue: "overall", ...counts }).onConflictDoUpdate({
    target: [campaignAnalytics.campaignId, campaignAnalytics.waveId, campaignAnalytics.variantId, campaignAnalytics.dimensionType, campaignAnalytics.dimensionValue],
    set: { ...counts, calculatedAt: new Date() }
  });
}

export async function handleJob(type: string, payload: Record<string, unknown>) {
  if (type === "prepare_campaign") return prepareCampaign(String(payload.campaignId));
  if (type === "process_webhook_event") return processEmailEvent(String(payload.eventId));
  if (type === "recalculate_campaign_analytics") return recalculateCampaignAnalytics(String(payload.campaignId));
  if (type === "send_provider_broadcast") {
    logger.warn("send job queued but provider broadcast send implementation requires configured provider resources", { wave_id: payload.waveId });
    return;
  }
  logger.info("job acknowledged without handler", { type });
}
