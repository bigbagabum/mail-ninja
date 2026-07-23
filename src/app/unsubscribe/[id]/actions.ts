"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import {
  campaignRecipients,
  emailEvents,
  recipients,
  suppressions,
} from "@/db/schema";
import { normalizeEmail } from "@/lib/normalization";
import { enqueueJob } from "@/server/jobs/queue";

export async function unsubscribeRecipient(campaignRecipientId: string) {
  const [row] = await db
    .select({
      campaignRecipient: campaignRecipients,
      recipient: recipients,
    })
    .from(campaignRecipients)
    .innerJoin(recipients, eq(campaignRecipients.recipientId, recipients.id))
    .where(eq(campaignRecipients.id, campaignRecipientId))
    .limit(1);

  if (!row) redirect(`/unsubscribe/${campaignRecipientId}?missing=1`);

  const occurredAt = new Date();
  const providerEventId = `local.unsubscribe.${campaignRecipientId}`;
  const [event] = await db
    .insert(emailEvents)
    .values({
      workspaceId: row.recipient.workspaceId,
      provider: "local",
      providerEventId,
      providerMessageId: row.campaignRecipient.providerMessageId,
      campaignId: row.campaignRecipient.campaignId,
      campaignRecipientId: row.campaignRecipient.id,
      recipientId: row.recipient.id,
      eventType: "unsubscribed",
      eventTimestamp: occurredAt,
      email: row.recipient.email,
      rawPayload: {
        source: "unsubscribe_page",
        campaignRecipientId,
      },
      processingStatus: "processed",
      processedAt: occurredAt,
    })
    .onConflictDoNothing()
    .returning();

  await db
    .update(campaignRecipients)
    .set({
      status: "unsubscribed",
      unsubscribedAt: row.campaignRecipient.unsubscribedAt ?? occurredAt,
      updatedAt: occurredAt,
    })
    .where(eq(campaignRecipients.id, campaignRecipientId));

  await db
    .insert(suppressions)
    .values({
      workspaceId: row.recipient.workspaceId,
      email: row.recipient.email,
      normalizedEmail: normalizeEmail(row.recipient.email),
      reason: "unsubscribe",
      source: "unsubscribe_page",
      campaignId: row.campaignRecipient.campaignId,
      emailEventId: event?.id,
      isPermanent: false,
    })
    .onConflictDoNothing();

  await enqueueJob({
    workspaceId: row.recipient.workspaceId,
    type: "recalculate_campaign_analytics",
    payload: { campaignId: row.campaignRecipient.campaignId },
    priority: 20,
  });

  redirect(`/unsubscribe/${campaignRecipientId}?done=1`);
}
