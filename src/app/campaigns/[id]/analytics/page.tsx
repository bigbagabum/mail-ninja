import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  campaignRecipients,
  campaigns,
  emailEvents,
  providerAccounts,
  workspaceSettings,
} from "@/db/schema";
import { requireAdmin } from "@/server/auth/session";
import { calculateRates } from "@/server/analytics/rates";
import { CampaignTabs } from "@/components/campaign-tabs";
import { Badge, PageHeader } from "@/components/ui";

export default async function CampaignAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requireAdmin();
  const { id } = await params;
  const campaign = await db.query.campaigns.findFirst({
    where: eq(campaigns.id, id),
  });
  if (!campaign) return <PageHeader title="Campaign not found" />;
  const [overall] = await db
    .select({
      selectedCount: sql<number>`count(*)::int`,
      preparedCount: sql<number>`count(*) filter (where ${campaignRecipients.preparedAt} is not null)::int`,
      sentCount: sql<number>`count(*) filter (where ${campaignRecipients.sentAt} is not null)::int`,
      deliveredCount: sql<number>`count(*) filter (where ${campaignRecipients.deliveredAt} is not null)::int`,
      uniqueOpenedCount: sql<number>`count(*) filter (where ${campaignRecipients.firstOpenedAt} is not null)::int`,
      totalOpenCount: sql<number>`coalesce(sum(${campaignRecipients.openCount}), 0)::int`,
      uniqueClickedCount: sql<number>`count(*) filter (where ${campaignRecipients.firstClickedAt} is not null)::int`,
      totalClickCount: sql<number>`coalesce(sum(${campaignRecipients.clickCount}), 0)::int`,
      delayedCount: sql<number>`count(*) filter (where ${campaignRecipients.deliveryDelayedAt} is not null)::int`,
      bouncedCount: sql<number>`count(*) filter (where ${campaignRecipients.bouncedAt} is not null)::int`,
      complainedCount: sql<number>`count(*) filter (where ${campaignRecipients.complainedAt} is not null)::int`,
      unsubscribedCount: sql<number>`count(*) filter (where ${campaignRecipients.unsubscribedAt} is not null)::int`,
      failedCount: sql<number>`count(*) filter (where ${campaignRecipients.failedAt} is not null)::int`,
    })
    .from(campaignRecipients)
    .where(eq(campaignRecipients.campaignId, id));
  const settings = await db.query.workspaceSettings.findFirst({
    where: eq(workspaceSettings.workspaceId, admin.workspaceId),
  });
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
      unsubscribedCount: sql<number>`count(*) filter (where ${emailEvents.eventType} = 'unsubscribed')::int`,
    })
    .from(emailEvents)
    .leftJoin(
      providerAccounts,
      eq(emailEvents.providerAccountId, providerAccounts.id),
    )
    .where(eq(emailEvents.campaignId, id))
    .groupBy(emailEvents.providerAccountId, providerAccounts.name);
  const rates = calculateRates({
    sent: overall.sentCount,
    delivered: overall.deliveredCount,
    uniqueOpened: overall.uniqueOpenedCount,
    uniqueClicked: overall.uniqueClickedCount,
    bounced: overall.bouncedCount,
    complained: overall.complainedCount,
    unsubscribed: overall.unsubscribedCount,
  });
  const metricCards = [
    ["Sent", overall.sentCount, "neutral"],
    ["Delivered", overall.deliveredCount, "good"],
    ["Opened", overall.uniqueOpenedCount, "neutral"],
    ["Clicked", overall.uniqueClickedCount, "neutral"],
    ["Bounced", overall.bouncedCount, "bad"],
    ["Unsubscribed", overall.unsubscribedCount, "warn"],
    ["Failed", overall.failedCount, "bad"],
    ["Delayed", overall.delayedCount, "warn"],
  ] as const;
  const rateCards: Array<[string, number]> = [
    ["Delivery rate", rates.deliveryRate],
    ["Open rate", rates.uniqueOpenRate],
    ["Click rate", rates.uniqueClickRate],
    ["Click-to-open", rates.clickToOpenRate],
    ["Bounce rate", rates.bounceRate],
    ["Unsubscribe rate", rates.unsubscribeRate],
  ];
  return (
    <>
      <PageHeader
        title={`${campaign.name} Report`}
        action={<Badge>{campaign.status}</Badge>}
      />
      <CampaignTabs id={id} />
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {metricCards.map(([label, value, tone]) => (
          <div key={label} className="rounded border border-line bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-muted">{label}</div>
              <Badge tone={tone}>{label.toLowerCase()}</Badge>
            </div>
            <div className="mt-3 text-2xl font-semibold">{value}</div>
          </div>
        ))}
      </section>
      <section className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rateCards.map(([label, value]) => (
          <div key={label} className="rounded border border-line bg-white p-4">
            <div className="text-sm text-muted">{label}</div>
            <div className="mt-2 text-xl font-semibold">
              {(value * 100).toFixed(1)}%
            </div>
          </div>
        ))}
      </section>
      <section className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded border border-line bg-white p-4">
          <div className="text-sm text-muted">Total opens</div>
          <div className="mt-2 text-xl font-semibold">
            {overall.totalOpenCount}
          </div>
        </div>
        <div className="rounded border border-line bg-white p-4">
          <div className="text-sm text-muted">Total clicks</div>
          <div className="mt-2 text-xl font-semibold">
            {overall.totalClickCount}
          </div>
        </div>
        <div className="rounded border border-line bg-white p-4">
          <div className="text-sm text-muted">Prepared recipients</div>
          <div className="mt-2 text-xl font-semibold">
            {overall.preparedCount} / {overall.selectedCount}
          </div>
        </div>
      </section>
      <p className="mt-4 text-sm text-muted">
        Open analytics are approximate and should not be treated as the primary
        campaign metric.
      </p>
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
                  <tr
                    key={row.providerAccountId ?? "environment"}
                    className="border-t border-line"
                  >
                    <td className="p-3 font-medium">
                      {row.providerAccountName ?? "Environment key"}
                    </td>
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
                    <td className="p-3 text-muted" colSpan={8}>
                      No provider-attributed events yet.
                    </td>
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
