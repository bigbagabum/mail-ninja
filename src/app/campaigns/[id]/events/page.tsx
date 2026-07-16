import { eq } from "drizzle-orm";
import { db } from "@/db";
import { campaigns, emailEvents, providerAccounts } from "@/db/schema";
import { requireAdmin } from "@/server/auth/session";
import { Badge, PageHeader } from "@/components/ui";
import { CampaignTabs } from "@/components/campaign-tabs";

export default async function CampaignEventsPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const campaign = await db.query.campaigns.findFirst({ where: eq(campaigns.id, id) });
  if (!campaign) return <PageHeader title="Campaign not found" />;

  const rows = await db
    .select({
      id: emailEvents.id,
      eventType: emailEvents.eventType,
      processingStatus: emailEvents.processingStatus,
      email: emailEvents.email,
      providerMessageId: emailEvents.providerMessageId,
      providerBroadcastId: emailEvents.providerBroadcastId,
      providerAccountName: providerAccounts.name,
      receivedAt: emailEvents.receivedAt,
      processingError: emailEvents.processingError
    })
    .from(emailEvents)
    .leftJoin(providerAccounts, eq(emailEvents.providerAccountId, providerAccounts.id))
    .where(eq(emailEvents.campaignId, id))
    .orderBy(emailEvents.receivedAt)
    .limit(200);

  return (
    <>
      <PageHeader title={`${campaign.name} Events`} />
      <CampaignTabs id={id} />
      <div className="overflow-hidden rounded border border-line bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-panel text-muted">
            <tr>
              <th className="p-3">Type</th>
              <th>Status</th>
              <th>Email</th>
              <th>API key</th>
              <th>Message</th>
              <th>Broadcast</th>
              <th>Received</th>
              <th>Error</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((event) => (
              <tr key={event.id} className="border-t border-line">
                <td className="p-3">{event.eventType}</td>
                <td><Badge>{event.processingStatus}</Badge></td>
                <td>{event.email}</td>
                <td>{event.providerAccountName ?? "Environment key"}</td>
                <td className="max-w-xs truncate">{event.providerMessageId}</td>
                <td className="max-w-xs truncate">{event.providerBroadcastId}</td>
                <td>{event.receivedAt.toISOString()}</td>
                <td className="max-w-xs truncate">{event.processingError}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td className="p-3 text-muted" colSpan={8}>No events have been recorded for this campaign yet.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}
