import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { emailEvents } from "@/db/schema";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { verifyResendWebhookWithSecret } from "@/server/provider/resend";
import { enqueueJob } from "@/server/jobs/queue";
import { extractClickedUrl } from "@/server/webhooks/events";
import { mapResendEventType } from "@/server/webhooks/mapping";
import { listWebhookSecrets } from "@/server/provider/accounts";

export async function POST(req: NextRequest) {
  const workspace = await db.query.workspaces.findFirst();
  if (!workspace) return NextResponse.json({ error: "not configured" }, { status: 503 });
  try {
    const payload = await req.text();
    const headers = {
      id: req.headers.get("svix-id"),
      timestamp: req.headers.get("svix-timestamp"),
      signature: req.headers.get("svix-signature")
    };
    const secrets = await listWebhookSecrets(workspace.id);
    if (secrets.length === 0) throw new Error("No Resend webhook secret is configured.");
    let verified: Awaited<ReturnType<typeof verifyResendWebhookWithSecret>> | null = null;
    let providerAccountId: string | null = null;
    for (const candidate of secrets) {
      try {
        verified = await verifyResendWebhookWithSecret({ payload, headers, webhookSecret: candidate.secret });
        providerAccountId = candidate.providerAccountId;
        break;
      } catch {
        verified = null;
      }
    }
    if (!verified) throw new Error("Webhook signature did not match any configured secret.");
    const existing = await db.query.emailEvents.findFirst({ where: eq(emailEvents.providerEventId, verified.providerEventId) });
    if (existing) return NextResponse.json({ ok: true, duplicate: true });
    const raw = verified.payload;
    const data = raw.data && typeof raw.data === "object" ? (raw.data as Record<string, unknown>) : {};
    const email = Array.isArray(data.to) ? String(data.to[0] ?? "") : typeof data.email === "string" ? data.email : null;
    const [event] = await db.insert(emailEvents).values({
      workspaceId: workspace.id,
      provider: "resend",
      providerAccountId,
      providerEventId: verified.providerEventId,
      providerMessageId: typeof data.message_id === "string" ? data.message_id : typeof data.email_id === "string" ? data.email_id : null,
      providerBroadcastId: typeof data.broadcast_id === "string" ? data.broadcast_id : null,
      eventType: mapResendEventType(verified.eventType),
      eventTimestamp: verified.eventTimestamp,
      email,
      rawPayload: raw,
      processingStatus: "queued",
      ...extractClickedUrl(raw)
    }).returning();
    await enqueueJob({ workspaceId: workspace.id, type: "process_webhook_event", payload: { eventId: event.id }, priority: 5 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.warn("resend webhook rejected", { error: error instanceof Error ? error.message : String(error), configured: Boolean(env.RESEND_WEBHOOK_SECRET) });
    return NextResponse.json({ error: "invalid webhook" }, { status: 400 });
  }
}
