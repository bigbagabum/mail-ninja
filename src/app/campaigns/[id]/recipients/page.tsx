import { eq } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { campaignRecipients, campaigns } from "@/db/schema";
import { requireAdmin } from "@/server/auth/session";
import { CampaignTabs } from "@/components/campaign-tabs";
import { PageHeader, Badge, EmptyState } from "@/components/ui";

export default async function CampaignRecipientsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const campaign = await db.query.campaigns.findFirst({
    where: eq(campaigns.id, id),
  });
  if (!campaign) return <PageHeader title="Campaign not found" />;
  const rows = await db.query.campaignRecipients.findMany({
    where: eq(campaignRecipients.campaignId, id),
    limit: 200,
  });
  return (
    <>
      <PageHeader title="Campaign Recipients" />
      <CampaignTabs id={id} />
      <div className="rounded border border-line bg-white p-4 text-sm text-muted">
        Prepared recipients: {rows.length}
      </div>
      {rows.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            title={
              campaign.status === "draft"
                ? "No recipients prepared yet"
                : "No campaign recipients found"
            }
            detail={
              campaign.status === "draft"
                ? "Recipients appear here after the campaign is prepared. Add an email template, configure waves, then prepare the campaign."
                : campaign.status === "preparing"
                  ? "Preparation is still running. Refresh this page in a moment."
                  : "Preparation completed without campaign recipients. Check recipient filters, suppressions, variants, and wave configuration."
            }
          />
          <div className="mt-3 flex gap-3 text-sm">
            <Link
              href={`/campaigns/${id}`}
              className="text-accent hover:underline"
            >
              Open overview
            </Link>
            <Link
              href={`/campaigns/${id}/variants`}
              className="text-accent hover:underline"
            >
              Check variants
            </Link>
            <Link
              href={`/campaigns/${id}/waves`}
              className="text-accent hover:underline"
            >
              Check waves
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded border border-line bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-panel text-muted">
              <tr>
                <th className="p-3">Recipient</th>
                <th>Status</th>
                <th>Wave</th>
                <th>Opens</th>
                <th>Clicks</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-line">
                  <td className="p-3">{row.recipientId}</td>
                  <td>
                    <Badge>{row.status}</Badge>
                  </td>
                  <td>{row.waveId}</td>
                  <td>{row.openCount}</td>
                  <td>{row.clickCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
