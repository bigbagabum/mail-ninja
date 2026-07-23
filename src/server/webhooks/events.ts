import { eq } from "drizzle-orm";
import { db } from "@/db";
import { campaignRecipients, emailEvents, suppressions } from "@/db/schema";
import { normalizeEmail } from "@/lib/normalization";
import { enqueueJob } from "@/server/jobs/queue";
import { classifyLink, normalizeClickedUrl } from "./links";

type CampaignRecipientStatus = typeof campaignRecipients.$inferSelect.status;

const statusRank: Record<CampaignRecipientStatus, number> = {
  pending: 0,
  excluded: 0,
  prepared: 1,
  synced: 2,
  scheduled: 3,
  sent: 4,
  delivered: 5,
  delayed: 5,
  opened: 6,
  clicked: 7,
  failed: 8,
  bounced: 9,
  complained: 10,
  unsubscribed: 11,
  suppressed: 12,
  cancelled: 13,
};

function strongestStatus(
  current: CampaignRecipientStatus,
  next: CampaignRecipientStatus,
) {
  return statusRank[next] >= statusRank[current] ? next : current;
}

export async function processEmailEvent(eventId: string) {
  const event = await db.query.emailEvents.findFirst({
    where: eq(emailEvents.id, eventId),
  });
  if (!event) return;
  const recipient = event.providerMessageId
    ? await db.query.campaignRecipients.findFirst({
        where: eq(
          campaignRecipients.providerMessageId,
          event.providerMessageId,
        ),
      })
    : null;
  const occurredAt = event.eventTimestamp;
  await db.transaction(async (tx) => {
    if (recipient) {
      const patch: Partial<typeof campaignRecipients.$inferInsert> = {
        updatedAt: new Date(),
      };
      if (event.eventType === "sent" && !recipient.sentAt) {
        patch.sentAt = occurredAt;
        patch.status = strongestStatus(recipient.status, "sent");
      }
      if (event.eventType === "delivered" && !recipient.deliveredAt) {
        patch.deliveredAt = occurredAt;
        patch.status = strongestStatus(recipient.status, "delivered");
      }
      if (event.eventType === "delivery_delayed") {
        patch.deliveryDelayedAt = occurredAt;
        patch.status = strongestStatus(recipient.status, "delayed");
      }
      if (event.eventType === "opened") {
        patch.firstOpenedAt = recipient.firstOpenedAt ?? occurredAt;
        patch.lastOpenedAt = occurredAt;
        patch.openCount = recipient.openCount + 1;
        patch.status = strongestStatus(recipient.status, "opened");
      }
      if (event.eventType === "clicked") {
        patch.firstClickedAt = recipient.firstClickedAt ?? occurredAt;
        patch.lastClickedAt = occurredAt;
        patch.clickCount = recipient.clickCount + 1;
        patch.status = strongestStatus(recipient.status, "clicked");
      }
      if (event.eventType === "bounced") {
        patch.bouncedAt = occurredAt;
        patch.status = strongestStatus(recipient.status, "bounced");
      }
      if (event.eventType === "complained") {
        patch.complainedAt = occurredAt;
        patch.status = strongestStatus(recipient.status, "complained");
      }
      if (event.eventType === "unsubscribed") {
        patch.unsubscribedAt = occurredAt;
        patch.status = strongestStatus(recipient.status, "unsubscribed");
      }
      if (event.eventType === "suppressed") {
        patch.suppressedAt = occurredAt;
        patch.status = strongestStatus(recipient.status, "suppressed");
      }
      if (event.eventType === "failed") {
        patch.failedAt = occurredAt;
        patch.status = strongestStatus(recipient.status, "failed");
      }
      await tx
        .update(campaignRecipients)
        .set(patch)
        .where(eq(campaignRecipients.id, recipient.id));
      await tx
        .update(emailEvents)
        .set({
          campaignId: recipient.campaignId,
          campaignRecipientId: recipient.id,
          recipientId: recipient.recipientId,
        })
        .where(eq(emailEvents.id, event.id));
    }
    if (
      ["bounced", "complained", "suppressed", "unsubscribed"].includes(
        event.eventType,
      ) &&
      event.email
    ) {
      await tx
        .insert(suppressions)
        .values({
          workspaceId: event.workspaceId,
          email: event.email,
          normalizedEmail: normalizeEmail(event.email),
          reason:
            event.eventType === "bounced"
              ? "hard_bounce"
              : event.eventType === "complained"
                ? "complaint"
                : event.eventType === "unsubscribed"
                  ? "unsubscribe"
                  : "provider_suppressed",
          source: "webhook",
          campaignId: recipient?.campaignId ?? event.campaignId,
          emailEventId: event.id,
          isPermanent:
            event.eventType === "bounced" ||
            event.eventType === "complained" ||
            event.eventType === "suppressed",
        })
        .onConflictDoNothing();
    }
    await tx
      .update(emailEvents)
      .set({ processingStatus: "processed", processedAt: new Date() })
      .where(eq(emailEvents.id, event.id));
  });
  if (recipient) {
    await enqueueJob({
      workspaceId: event.workspaceId,
      type: "recalculate_campaign_analytics",
      payload: { campaignId: recipient.campaignId },
      priority: 20,
    });
  }
}

export function extractClickedUrl(payload: Record<string, unknown>) {
  const data =
    payload.data && typeof payload.data === "object"
      ? (payload.data as Record<string, unknown>)
      : {};
  const url =
    data.click && typeof data.click === "object"
      ? (data.click as Record<string, unknown>).link
      : data.url;
  if (typeof url !== "string") return {};
  const normalized = normalizeClickedUrl(url);
  return {
    clickedUrl: url,
    clickedUrlNormalized: normalized,
    linkCategory: classifyLink(normalized),
  };
}
