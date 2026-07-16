import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { campaignAnalytics, emailEvents, providerAccounts, workspaceSettings } from "@/db/schema";
import { requireAdmin } from "@/server/auth/session";
import { calculateRates } from "@/server/analytics/rates";
import { CampaignTabs } from "@/components/campaign-tabs";
import { PageHeader } from "@/components/ui";

export default async function CampaignAnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  const rows = await db.query.campaignAnalytics.findMany({ where: eq(campaignAnalytics.campaignId, id) });
  const settings = await db.query.workspaceSettings.findFirst({ where: eq(workspaceSettings.workspaceId, admin.workspaceId) });
  const providerBreakdown = await db
    .select({
      providerAccountId: emailEvents.providerAccountId,
      providerAccountName: providerAccounts.name,
      sentCount: sql<number>`count(*) filter (where ${emailEvents.eventType} = 'sent')::int`,
      deliveredCount: sql<number>`count(*) filter (where ${emailEvents.eventType} = 'delivered')::int`,
      openedCount: sql<number>`count(*) filter (where ${emailEvents.eventType} = 'opened')::int`,
      clickedCount: sql<number>`count(*) filter (where ${emailEvents.eventType} = 'clicked')::int`,
      bouncedCount: sql<number>`count(*) filter (where ${emailEvents.eventType} = 'bounced')::int`,
      complainedCount: sql<number>`count(*) filter (where ${emailEvents.eventType} = 'complained')::int`,
      unsubscribedCount: sql<number>`count(*) filter (where ${emailEvents.eventType} = 'unsubscribed')::int`
    })
    .from(emailEvents)
    .leftJoin(providerAccounts, eq(emailEvents.providerAccountId, providerAccounts.id))
    .where(eq(emailEvents.campaignId, id))
    .groupBy(emailEvents.providerAccountId, providerAccounts.name);
  const overall = rows.find((row) => row.dimensionType === "overall") ?? { sentCount: 0, deliveredCount: 0, uniqueOpenedCount: 0, uniqueClickedCount: 0, bouncedCount: 0, complainedCount: 0, unsubscribedCount: 0 };
  const rates = calculateRates({ sent: overall.sentCount, delivered: overall.deliveredCount, uniqueOpened: overall.uniqueOpenedCount, uniqueClicked: overall.uniqueClickedCount, bounced: overall.bouncedCount, complained: overall.complainedCount, unsubscribed: overall.unsubscribedCount });
  return (
    <>
      <PageHeader title="Campaign Analytics" />
      <CampaignTabs id={id} />
      <div className="grid gap-4 md:grid-cols-4">
        {Object.entries(rates).map(([key, value]) => <div key={key} className="rounded border border-line bg-white p-4"><div className="text-sm text-muted">{key}</div><div className="mt-2 text-xl font-semibold">{(value * 100).toFixed(1)}%</div></div>)}
      </div>
      <p className="mt-4 text-sm text-muted">Open analytics are approximate and should not be treated as the primary campaign metric.</p>
      {settings?.providerMetricsMode === "by_provider_account" ? (
        <section className="mt-6">
          <h2 className="mb-3 font-semibold">Provider Key Breakdown</h2>
          <div className="overflow-hidden rounded border border-line bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-panel text-muted">
                <tr>
                  <th className="p-3">API key</th>
                  <th>Sent</th>
                  <th>Delivered</th>
                  <th>Opened</th>
                  <th>Clicked</th>
                  <th>Bounced</th>
                  <th>Complained</th>
                  <th>Unsubscribed</th>
                </tr>
              </thead>
              <tbody>
                {providerBreakdown.map((row) => (
                  <tr key={row.providerAccountId ?? "environment"} className="border-t border-line">
                    <td className="p-3 font-medium">{row.providerAccountName ?? "Environment key"}</td>
                    <td>{row.sentCount}</td>
                    <td>{row.deliveredCount}</td>
                    <td>{row.openedCount}</td>
                    <td>{row.clickedCount}</td>
                    <td>{row.bouncedCount}</td>
                    <td>{row.complainedCount}</td>
                    <td>{row.unsubscribedCount}</td>
                  </tr>
                ))}
                {providerBreakdown.length === 0 ? (
                  <tr>
                    <td className="p-3 text-muted" colSpan={8}>No provider-attributed events yet.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </>
  );
}
