import { eq } from "drizzle-orm";
import { db } from "@/db";
import { campaignRecipients } from "@/db/schema";
import { requireAdmin } from "@/server/auth/session";
import { CampaignTabs } from "@/components/campaign-tabs";
import { PageHeader, Badge } from "@/components/ui";

export default async function CampaignRecipientsPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const rows = await db.query.campaignRecipients.findMany({ where: eq(campaignRecipients.campaignId, id), limit: 200 });
  return (
    <>
      <PageHeader title="Campaign Recipients" />
      <CampaignTabs id={id} />
      <div className="rounded border border-line bg-white p-4 text-sm text-muted">Prepared recipients: {rows.length}</div>
      <div className="mt-4 overflow-hidden rounded border border-line bg-white">
        <table className="w-full text-left text-sm"><thead className="bg-panel text-muted"><tr><th className="p-3">Recipient</th><th>Status</th><th>Wave</th><th>Opens</th><th>Clicks</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-t border-line"><td className="p-3">{row.recipientId}</td><td><Badge>{row.status}</Badge></td><td>{row.waveId}</td><td>{row.openCount}</td><td>{row.clickCount}</td></tr>)}</tbody></table>
      </div>
    </>
  );
}
