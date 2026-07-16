import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { recipients } from "@/db/schema";
import { requireAdmin } from "@/server/auth/session";
import { PageHeader } from "@/components/ui";

export default async function RecipientsPage() {
  const admin = await requireAdmin();
  const rows = await db.query.recipients.findMany({ where: eq(recipients.workspaceId, admin.workspaceId), limit: 100, orderBy: (table, { desc }) => [desc(table.createdAt)] });
  return (
    <>
      <PageHeader title="Recipients" />
      <div className="overflow-hidden rounded border border-line bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-panel text-muted"><tr><th className="p-3">Email</th><th>Name</th><th>Locale</th><th>Role</th><th>Platform</th><th>Priority</th><th>Cohort</th></tr></thead>
          <tbody>
            {rows.map((recipient) => (
              <tr key={recipient.id} className="border-t border-line">
                <td className="p-3"><Link href={`/recipients/${recipient.id}`} className="font-medium hover:underline">{recipient.email}</Link></td>
                <td>{[recipient.firstName, recipient.lastName].filter(Boolean).join(" ")}</td><td>{recipient.locale}</td><td>{recipient.role}</td><td>{recipient.platform}</td><td>{recipient.priorityScore}</td><td>{recipient.priorityCohort}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
