import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  campaignRecipients,
  campaigns,
  campaignVariants,
  campaignWaves,
  suppressions,
} from "@/db/schema";
import { logger } from "@/lib/logger";
import {
  loadFilteredRecipients,
  parseCampaignRecipientFilters,
} from "@/server/campaigns/recipient-filters";
import { resolveVariant } from "@/server/campaigns/variants";
import { assignWave } from "@/server/campaigns/waves";

export async function prepareCampaign(campaignId: string) {
  const campaign = await db.query.campaigns.findFirst({
    where: eq(campaigns.id, campaignId),
  });
  if (!campaign) throw new Error("Campaign not found.");
  if (campaign.status !== "draft" && campaign.status !== "preparing") {
    throw new Error("Only draft campaigns can be prepared.");
  }
  const variants = await db.query.campaignVariants.findMany({
    where: eq(campaignVariants.campaignId, campaignId),
  });
  const waves = await db.query.campaignWaves.findMany({
    where: eq(campaignWaves.campaignId, campaignId),
    orderBy: (table, { asc }) => [asc(table.position)],
  });
  if (!variants.some((variant) => variant.isFallback)) {
    throw new Error("Fallback variant is required.");
  }
  if (waves.length === 0) throw new Error("At least one wave is required.");
  const filters = parseCampaignRecipientFilters(campaign.metadata);
  const selected = await loadFilteredRecipients(campaign.workspaceId, filters);
  const suppressionRows = await db.query.suppressions.findMany({
    where: and(
      eq(suppressions.workspaceId, campaign.workspaceId),
      isNull(suppressions.expiresAt),
    ),
  });
  const suppressionSet = new Set(
    suppressionRows.map((row) => row.normalizedEmail),
  );
  const eligible = selected.filter(
    (recipient) => !suppressionSet.has(recipient.normalizedEmail),
  );
  if (eligible.length === 0) {
    throw new Error(
      "No eligible recipients matched the campaign filters after suppressions.",
    );
  }
  let preparedCount = 0;
  await db.transaction(async (tx) => {
    await tx
      .update(campaigns)
      .set({ status: "preparing", updatedAt: new Date() })
      .where(eq(campaigns.id, campaignId));
    let index = 0;
    for (const recipient of eligible) {
      const variant = resolveVariant(variants, {
        locale: recipient.locale,
        role: recipient.role,
        defaultLocale: campaign.defaultLocale,
      });
      if (!variant) throw new Error(`No variant for recipient ${recipient.id}`);
      const waveId = assignWave(index, waves);
      index += 1;
      if (!waveId) throw new Error("Wave assignment failed.");
      const inserted = await tx
        .insert(campaignRecipients)
        .values({
          campaignId,
          recipientId: recipient.id,
          variantId: variant.id,
          waveId,
          status: "prepared",
          preparedAt: new Date(),
        })
        .onConflictDoNothing()
        .returning({ id: campaignRecipients.id });
      preparedCount += inserted.length;
    }
    await tx
      .update(campaignWaves)
      .set({ status: "ready", updatedAt: new Date() })
      .where(eq(campaignWaves.campaignId, campaignId));
    await tx
      .update(campaigns)
      .set({ status: "ready", preparedAt: new Date(), updatedAt: new Date() })
      .where(eq(campaigns.id, campaignId));
  });
  logger.info("campaign prepared", {
    campaign_id: campaignId,
    prepared_count: preparedCount,
    filters,
  });
  return { preparedCount };
}
