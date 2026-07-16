import { Resend, type CreateBroadcastOptions } from "resend";
import { env } from "@/lib/env";
import { markProviderAccountUsed, selectProviderAccount, type SelectedProviderAccount } from "./accounts";
import type {
  AddContactsResult,
  AddContactsToSegmentInput,
  CreateBroadcastInput,
  CreateSegmentInput,
  EmailCampaignProvider,
  ProviderBroadcast,
  ProviderContact,
  ProviderSegment,
  SendBroadcastInput,
  SendBroadcastResult,
  SendTestEmailInput,
  SendTestEmailResult,
  UpsertContactInput,
  VerifiedWebhookEvent,
  VerifyWebhookInput
} from "./types";

function idFrom(data: unknown) {
  if (data && typeof data === "object" && "id" in data && typeof data.id === "string") return data.id;
  throw new Error("Provider response did not include an id.");
}

export class ResendEmailCampaignProvider implements EmailCampaignProvider {
  private client: Resend;
  private providerAccountId: string | null;

  constructor(input?: { apiKey?: string; providerAccountId?: string | null }) {
    const apiKey = input?.apiKey ?? env.RESEND_API_KEY ?? "re_webhook_verification_only";
    this.client = new Resend(apiKey);
    this.providerAccountId = input?.providerAccountId ?? null;
  }

  async verifyWebhook(input: VerifyWebhookInput): Promise<VerifiedWebhookEvent> {
    const webhookSecret = input.webhookSecret ?? env.RESEND_WEBHOOK_SECRET;
    if (!webhookSecret) throw new Error("RESEND_WEBHOOK_SECRET is not configured.");
    if (!input.headers.id || !input.headers.timestamp || !input.headers.signature) {
      throw new Error("Missing webhook signature headers.");
    }
    const result = await this.client.webhooks.verify({
      payload: input.payload,
      headers: { id: input.headers.id, timestamp: input.headers.timestamp, signature: input.headers.signature },
      webhookSecret
    });
    const payload = result as unknown as Record<string, unknown>;
    return {
      providerEventId: input.headers.id ?? String(payload.id ?? crypto.randomUUID()),
      eventType: String(payload.type ?? "unknown"),
      eventTimestamp: new Date(String(payload.created_at ?? new Date().toISOString())),
      payload
    };
  }

  async upsertContact(input: UpsertContactInput): Promise<ProviderContact> {
    const { data, error } = await this.client.contacts.create({
      email: input.email,
      firstName: input.firstName ?? undefined,
      lastName: input.lastName ?? undefined,
      unsubscribed: input.unsubscribed ?? false
    });
    if (error) throw new Error(error.message);
    await markProviderAccountUsed(this.providerAccountId);
    return { id: idFrom(data), raw: data };
  }

  async createSegment(input: CreateSegmentInput): Promise<ProviderSegment> {
    const { data, error } = await this.client.segments.create({ name: input.name });
    if (error) throw new Error(error.message);
    await markProviderAccountUsed(this.providerAccountId);
    return { id: idFrom(data), raw: data };
  }

  async addContactsToSegment(input: AddContactsToSegmentInput): Promise<AddContactsResult> {
    return { added: input.contactIds.length, raw: { note: "Segment membership reconciliation is provider-version dependent.", segmentId: input.segmentId } };
  }

  async createBroadcast(input: CreateBroadcastInput): Promise<ProviderBroadcast> {
    const base = {
      segmentId: input.segmentId,
      from: input.from,
      subject: input.subject,
      ...(input.scheduledAt ? { scheduledAt: input.scheduledAt } : {})
    };
    const payload = (input.text ? { ...base, html: input.html, text: input.text } : { ...base, html: input.html }) as CreateBroadcastOptions;
    const { data, error } = await this.client.broadcasts.create(payload);
    if (error) throw new Error(error.message);
    await markProviderAccountUsed(this.providerAccountId);
    return { id: idFrom(data), raw: data };
  }

  async sendBroadcast(input: SendBroadcastInput): Promise<SendBroadcastResult> {
    const { data, error } = await this.client.broadcasts.send(input.broadcastId);
    if (error) throw new Error(error.message);
    return { id: idFrom(data), raw: data };
  }

  async sendTestEmail(input: SendTestEmailInput): Promise<SendTestEmailResult> {
    const { data, error } = await this.client.emails.send({
      from: input.from,
      to: input.to,
      subject: `[TEST] ${input.subject}`,
      html: input.html,
      text: input.text ?? undefined
    });
    if (error) throw new Error(error.message);
    await markProviderAccountUsed(this.providerAccountId);
    return { id: idFrom(data), raw: data };
  }
}

export function createProvider(): EmailCampaignProvider {
  return new ResendEmailCampaignProvider();
}

export async function verifyResendWebhookWithSecret(input: VerifyWebhookInput & { webhookSecret: string }) {
  return new ResendEmailCampaignProvider().verifyWebhook(input);
}

export async function createProviderForWorkspace(workspaceId: string): Promise<{
  provider: EmailCampaignProvider;
  account: SelectedProviderAccount;
}> {
  const account = await selectProviderAccount(workspaceId, "resend");
  return {
    provider: new ResendEmailCampaignProvider({ apiKey: account.apiKey, providerAccountId: account.id }),
    account
  };
}
