import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { campaigns, emailEvents } from "@/db/schema";
import { CampaignTabs } from "@/components/campaign-tabs";
import { Badge, PageHeader } from "@/components/ui";

export default async function CampaignLinksPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const campaign = await db.query.campaigns.findFirst({
    where: eq(campaigns.id, id),
  });
  if (!campaign) return <PageHeader title="Campaign not found" />;

  const rows = await db
    .select({
      url: emailEvents.clickedUrlNormalized,
      category: emailEvents.linkCategory,
      totalClicks: sql<number>`count(*)::int`,
      uniqueRecipients: sql<number>`count(distinct ${emailEvents.recipientId})::int`,
      lastClickedAt: sql<Date>`max(${emailEvents.eventTimestamp})`,
    })
    .from(emailEvents)
    .where(
      sql`${emailEvents.campaignId} = ${id} and ${emailEvents.eventType} = 'clicked' and ${emailEvents.clickedUrlNormalized} is not null`,
    )
    .groupBy(emailEvents.clickedUrlNormalized, emailEvents.linkCategory)
    .orderBy(desc(sql`count(*)`))
    .limit(200);

  return (
    <>
      <PageHeader title={`${campaign.name} Links`} />
      <CampaignTabs id={id} />
      <div className="overflow-hidden rounded border border-line bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-panel text-muted">
            <tr>
              <th className="p-3">URL</th>
              <th>Category</th>
              <th>Total clicks</th>
              <th>Unique recipients</th>
              <th>Last click</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.url ?? "unknown"} className="border-t border-line">
                <td className="max-w-xl truncate p-3">{row.url}</td>
                <td>
                  <Badge>{row.category ?? "link"}</Badge>
                </td>
                <td>{row.totalClicks}</td>
                <td>{row.uniqueRecipients}</td>
                <td>{row.lastClickedAt?.toISOString()}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td className="p-3 text-muted" colSpan={5}>
                  No clicked links have been recorded for this campaign yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}
