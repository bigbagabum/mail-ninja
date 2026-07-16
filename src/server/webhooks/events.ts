import { eq } from "drizzle-orm";
import { db } from "@/db";
import { campaignRecipients, emailEvents, suppressions } from "@/db/schema";
import { normalizeEmail } from "@/lib/normalization";
import { classifyLink, normalizeClickedUrl } from "./links";

export async function processEmailEvent(eventId: string) {
  const event = await db.query.emailEvents.findFirst({ where: eq(emailEvents.id, eventId) });
  if (!event) return;
  const recipient = event.providerMessageId
    ? await db.query.campaignRecipients.findFirst({ where: eq(campaignRecipients.providerMessageId, event.providerMessageId) })
    : null;
  const occurredAt = event.eventTimestamp;
  await db.transaction(async (tx) => {
    if (recipient) {
      const patch: Partial<typeof campaignRecipients.$inferInsert> = { updatedAt: new Date() };
      if (event.eventType === "sent" && !recipient.sentAt) patch.sentAt = occurredAt;
      if (event.eventType === "delivered" && !recipient.deliveredAt) patch.deliveredAt = occurredAt;
      if (event.eventType === "delivery_delayed") patch.deliveryDelayedAt = occurredAt;
      if (event.eventType === "opened") {
        patch.firstOpenedAt = recipient.firstOpenedAt ?? occurredAt;
        patch.lastOpenedAt = occurredAt;
        patch.openCount = recipient.openCount + 1;
      }
      if (event.eventType === "clicked") {
        patch.firstClickedAt = recipient.firstClickedAt ?? occurredAt;
        patch.lastClickedAt = occurredAt;
        patch.clickCount = recipient.clickCount + 1;
      }
      if (event.eventType === "bounced") patch.bouncedAt = occurredAt;
      if (event.eventType === "complained") patch.complainedAt = occurredAt;
      if (event.eventType === "unsubscribed") patch.unsubscribedAt = occurredAt;
      if (event.eventType === "suppressed") patch.suppressedAt = occurredAt;
      if (event.eventType === "failed") patch.failedAt = occurredAt;
      await tx.update(campaignRecipients).set(patch).where(eq(campaignRecipients.id, recipient.id));
    }
    if (["bounced", "complained", "suppressed", "unsubscribed"].includes(event.eventType) && event.email) {
      await tx.insert(suppressions).values({
        workspaceId: event.workspaceId,
        email: event.email,
        normalizedEmail: normalizeEmail(event.email),
        reason: event.eventType === "bounced" ? "hard_bounce" : event.eventType === "complained" ? "complaint" : event.eventType === "unsubscribed" ? "unsubscribe" : "provider_suppressed",
        source: "webhook",
        campaignId: event.campaignId,
        emailEventId: event.id,
        isPermanent: event.eventType === "bounced" || event.eventType === "complained" || event.eventType === "suppressed"
      }).onConflictDoNothing();
    }
    await tx.update(emailEvents).set({ processingStatus: "processed", processedAt: new Date() }).where(eq(emailEvents.id, event.id));
  });
}

export function extractClickedUrl(payload: Record<string, unknown>) {
  const data = payload.data && typeof payload.data === "object" ? (payload.data as Record<string, unknown>) : {};
  const url = data.click && typeof data.click === "object" ? (data.click as Record<string, unknown>).link : data.url;
  if (typeof url !== "string") return {};
  const normalized = normalizeClickedUrl(url);
  return { clickedUrl: url, clickedUrlNormalized: normalized, linkCategory: classifyLink(normalized) };
}
