import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { campaignAnalytics, campaignRecipients } from "@/db/schema";
import { logger } from "@/lib/logger";
import { prepareCampaign } from "@/server/campaigns/prepare";
import { processEmailEvent } from "@/server/webhooks/events";

export async function recalculateCampaignAnalytics(campaignId: string) {
  const rows = await db.query.campaignRecipients.findMany({
    where: eq(campaignRecipients.campaignId, campaignId),
  });
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
    failedCount: rows.filter((row) => row.failedAt).length,
  };
  await db
    .insert(campaignAnalytics)
    .values({
      campaignId,
      dimensionType: "overall",
      dimensionValue: "overall",
      ...counts,
    })
    .onConflictDoUpdate({
      target: [
        campaignAnalytics.campaignId,
        campaignAnalytics.waveId,
        campaignAnalytics.variantId,
        campaignAnalytics.dimensionType,
        campaignAnalytics.dimensionValue,
      ],
      set: { ...counts, calculatedAt: new Date() },
    });
}

export async function handleJob(
  type: string,
  payload: Record<string, unknown>,
) {
  if (type === "prepare_campaign")
    return prepareCampaign(String(payload.campaignId));
  if (type === "process_webhook_event")
    return processEmailEvent(String(payload.eventId));
  if (type === "recalculate_campaign_analytics")
    return recalculateCampaignAnalytics(String(payload.campaignId));
  if (type === "send_provider_broadcast") {
    logger.warn(
      "send job queued but provider broadcast send implementation requires configured provider resources",
      { wave_id: payload.waveId },
    );
    return;
  }
  logger.info("job acknowledged without handler", { type });
}
