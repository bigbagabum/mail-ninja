import { db } from "@/db";
import { requireAdmin } from "@/server/auth/session";
import { Badge, PageHeader } from "@/components/ui";

export default async function EventsPage() {
  await requireAdmin();
  const rows = await db.query.emailEvents.findMany({
    limit: 100,
    orderBy: (table, { desc }) => [desc(table.receivedAt)],
  });
  return (
    <>
      <PageHeader title="Event Explorer" />
      <div className="rounded border border-line bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-panel text-muted">
            <tr>
              <th className="p-3">Type</th>
              <th>Status</th>
              <th>Email</th>
              <th>Message</th>
              <th>Received</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((event) => (
              <tr key={event.id} className="border-t border-line">
                <td className="p-3">{event.eventType}</td>
                <td>
                  <Badge>{event.processingStatus}</Badge>
                </td>
                <td>{event.email}</td>
                <td className="max-w-xs truncate">{event.providerMessageId}</td>
                <td>{event.receivedAt.toISOString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
