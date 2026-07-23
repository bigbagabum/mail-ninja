import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  campaignAnalytics,
  campaignRecipients,
  campaigns,
  campaignVariants,
  campaignWaves,
  recipients,
  workspaceSettings,
} from "@/db/schema";
import { logger } from "@/lib/logger";
import { renderTemplate } from "@/lib/templates";
import { prepareCampaign } from "@/server/campaigns/prepare";
import { createProviderForWorkspace } from "@/server/provider/resend";
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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildVariables(input: {
  campaignName: string;
  unsubscribeUrl: string;
  recipient: typeof recipients.$inferSelect;
}) {
  return {
    first_name: input.recipient.firstName,
    last_name: input.recipient.lastName,
    email: input.recipient.email,
    locale: input.recipient.locale,
    role: input.recipient.role,
    platform: input.recipient.platform,
    external_id: input.recipient.externalId,
    campaign_name: input.campaignName,
    unsubscribe_url: input.unsubscribeUrl,
  };
}

async function getPublicBaseUrl(workspaceId: string) {
  const settings = await db.query.workspaceSettings.findFirst({
    where: eq(workspaceSettings.workspaceId, workspaceId),
  });
  return (
    settings?.publicBaseUrl ??
    process.env.APP_BASE_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

async function sendProviderBroadcastWave(waveId: string) {
  const wave = await db.query.campaignWaves.findFirst({
    where: eq(campaignWaves.id, waveId),
  });
  if (!wave) throw new Error("Campaign wave not found.");
  const campaign = await db.query.campaigns.findFirst({
    where: eq(campaigns.id, wave.campaignId),
  });
  if (!campaign) throw new Error("Campaign not found.");

  const rows = await db
    .select({
      campaignRecipient: campaignRecipients,
      recipient: recipients,
      variant: campaignVariants,
    })
    .from(campaignRecipients)
    .innerJoin(recipients, eq(campaignRecipients.recipientId, recipients.id))
    .innerJoin(
      campaignVariants,
      eq(campaignRecipients.variantId, campaignVariants.id),
    )
    .where(
      and(
        eq(campaignRecipients.waveId, waveId),
        sql`${campaignRecipients.sentAt} is null`,
        sql`${campaignRecipients.status} in ('prepared', 'synced', 'scheduled')`,
      ),
    );
  if (rows.length === 0) {
    await db
      .update(campaignWaves)
      .set({
        status: "completed",
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(campaignWaves.id, waveId));
    await completeCampaignIfFullySent(campaign.id);
    return { sent: 0 };
  }

  const { provider } = await createProviderForWorkspace(campaign.workspaceId);
  const publicBaseUrl = await getPublicBaseUrl(campaign.workspaceId);
  await db
    .update(campaignWaves)
    .set({ status: "sending", startedAt: new Date(), updatedAt: new Date() })
    .where(eq(campaignWaves.id, waveId));

  let sent = 0;
  for (const row of rows) {
    const variables = buildVariables({
      campaignName: campaign.name,
      unsubscribeUrl: `${publicBaseUrl}/unsubscribe/${row.campaignRecipient.id}`,
      recipient: row.recipient,
    });
    try {
      const result = await provider.sendEmail({
        from: `${campaign.fromName} <${campaign.fromEmail}>`,
        to: [row.recipient.email],
        subject: renderTemplate(row.variant.subject, variables),
        html: renderTemplate(row.variant.htmlContent, variables),
        text: row.variant.textContent
          ? renderTemplate(row.variant.textContent, variables)
          : null,
      });
      await db
        .update(campaignRecipients)
        .set({
          status: "sent",
          providerMessageId: result.id,
          sentAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(campaignRecipients.id, row.campaignRecipient.id));
      sent += 1;
      await sleep(500);
    } catch (error) {
      await db
        .update(campaignRecipients)
        .set({
          status: "failed",
          failedAt: new Date(),
          lastError: error instanceof Error ? error.message : String(error),
          updatedAt: new Date(),
        })
        .where(eq(campaignRecipients.id, row.campaignRecipient.id));
      throw error;
    }
  }

  await db
    .update(campaignWaves)
    .set({
      status: "completed",
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(campaignWaves.id, waveId));
  await completeCampaignIfFullySent(campaign.id);
  return { sent };
}

async function completeCampaignIfFullySent(campaignId: string) {
  const remaining = await db.query.campaignRecipients.findFirst({
    where: and(
      eq(campaignRecipients.campaignId, campaignId),
      sql`${campaignRecipients.sentAt} is null`,
      sql`${campaignRecipients.status} in ('prepared', 'synced', 'scheduled')`,
    ),
  });
  if (remaining) return;
  await db
    .update(campaigns)
    .set({
      status: "completed",
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(campaigns.id, campaignId));
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
    return sendProviderBroadcastWave(String(payload.waveId));
  }
  logger.info("job acknowledged without handler", { type });
}
