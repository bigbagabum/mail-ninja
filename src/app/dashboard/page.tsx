import { count, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  campaigns,
  campaignRecipients,
  emailEvents,
  jobs,
  recipients,
  suppressions,
} from "@/db/schema";
import { requireAdmin } from "@/server/auth/session";
import { PageHeader } from "@/components/ui";

async function metric(label: string, value: number | string) {
  return (
    <div className="rounded border border-line bg-white p-4">
      <div className="text-sm text-muted">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}

export default async function DashboardPage() {
  const admin = await requireAdmin();
  const [recipientCount] = await db
    .select({ value: count() })
    .from(recipients)
    .where(eq(recipients.workspaceId, admin.workspaceId));
  const [suppressionCount] = await db
    .select({ value: count() })
    .from(suppressions)
    .where(eq(suppressions.workspaceId, admin.workspaceId));
  const [campaignCount] = await db
    .select({ value: count() })
    .from(campaigns)
    .where(eq(campaigns.workspaceId, admin.workspaceId));
  const [sentCount] = await db
    .select({ value: count() })
    .from(campaignRecipients)
    .where(sql`${campaignRecipients.sentAt} is not null`);
  const [deliveredCount] = await db
    .select({ value: count() })
    .from(campaignRecipients)
    .where(sql`${campaignRecipients.deliveredAt} is not null`);
  const [clickCount] = await db
    .select({ value: count() })
    .from(emailEvents)
    .where(eq(emailEvents.eventType, "clicked"));
  const failedJobs = await db.query.jobs.findMany({
    where: eq(jobs.status, "failed"),
    limit: 5,
    orderBy: (table, { desc }) => [desc(table.updatedAt)],
  });

  return (
    <>
      <PageHeader title="Dashboard" />
      <div className="grid gap-4 md:grid-cols-3">
        {metric("Total recipients", recipientCount.value)}
        {metric("Suppressed recipients", suppressionCount.value)}
        {metric("Campaigns", campaignCount.value)}
        {metric("Emails sent", sentCount.value)}
        {metric("Emails delivered", deliveredCount.value)}
        {metric("Total click events", clickCount.value)}
      </div>
      <section className="mt-8">
        <h2 className="mb-3 font-semibold">Recent failed jobs</h2>
        <div className="overflow-hidden rounded border border-line bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-panel text-muted">
              <tr>
                <th className="p-3">Type</th>
                <th>Status</th>
                <th>Attempts</th>
                <th>Error</th>
              </tr>
            </thead>
            <tbody>
              {failedJobs.map((job) => (
                <tr key={job.id} className="border-t border-line">
                  <td className="p-3">{job.type}</td>
                  <td>{job.status}</td>
                  <td>
                    {job.attempts}/{job.maxAttempts}
                  </td>
                  <td className="max-w-md truncate">{job.lastError}</td>
                </tr>
              ))}
              {failedJobs.length === 0 ? (
                <tr>
                  <td className="p-3 text-muted" colSpan={4}>
                    No failed jobs.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
