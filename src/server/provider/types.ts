export type VerifyWebhookInput = {
  payload: string;
  headers: { id: string | null; timestamp: string | null; signature: string | null };
  webhookSecret?: string | null;
};
export type VerifiedWebhookEvent = { providerEventId: string; eventType: string; eventTimestamp: Date; payload: Record<string, unknown> };
export type UpsertContactInput = { email: string; firstName?: string | null; lastName?: string | null; unsubscribed?: boolean };
export type ProviderContact = { id: string; raw: unknown };
export type CreateSegmentInput = { name: string };
export type ProviderSegment = { id: string; raw: unknown };
export type AddContactsToSegmentInput = { segmentId: string; contactIds: string[] };
export type AddContactsResult = { added: number; raw: unknown };
export type CreateBroadcastInput = { segmentId: string; from: string; subject: string; html: string; text?: string | null; scheduledAt?: string | null };
export type ProviderBroadcast = { id: string; raw: unknown };
export type SendBroadcastInput = { broadcastId: string };
export type SendBroadcastResult = { id: string; raw: unknown };
export type SendTestEmailInput = { from: string; to: string[]; subject: string; html: string; text?: string | null };
export type SendTestEmailResult = { id: string; raw: unknown };

export interface EmailCampaignProvider {
  verifyWebhook(input: VerifyWebhookInput): Promise<VerifiedWebhookEvent>;
  upsertContact(input: UpsertContactInput): Promise<ProviderContact>;
  createSegment(input: CreateSegmentInput): Promise<ProviderSegment>;
  addContactsToSegment(input: AddContactsToSegmentInput): Promise<AddContactsResult>;
  createBroadcast(input: CreateBroadcastInput): Promise<ProviderBroadcast>;
  sendBroadcast(input: SendBroadcastInput): Promise<SendBroadcastResult>;
  sendTestEmail(input: SendTestEmailInput): Promise<SendTestEmailResult>;
}
