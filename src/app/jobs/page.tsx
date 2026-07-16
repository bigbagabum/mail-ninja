import { db } from "@/db";
import { requireAdmin } from "@/server/auth/session";
import { PageHeader, Badge } from "@/components/ui";

export default async function JobsPage() {
  await requireAdmin();
  const rows = await db.query.jobs.findMany({ limit: 100, orderBy: (table, { desc }) => [desc(table.createdAt)] });
  return (
    <>
      <PageHeader title="Jobs" />
      <div className="overflow-hidden rounded border border-line bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-panel text-muted"><tr><th className="p-3">Type</th><th>Status</th><th>Attempts</th><th>Run after</th><th>Locked by</th><th>Error</th></tr></thead>
          <tbody>{rows.map((job) => <tr key={job.id} className="border-t border-line"><td className="p-3">{job.type}</td><td><Badge>{job.status}</Badge></td><td>{job.attempts}/{job.maxAttempts}</td><td>{job.runAfter.toISOString()}</td><td>{job.lockedBy}</td><td className="max-w-xs truncate">{job.lastError}</td></tr>)}</tbody>
        </table>
      </div>
    </>
  );
}
