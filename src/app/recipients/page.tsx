import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { recipients } from "@/db/schema";
import { requireAdmin } from "@/server/auth/session";
import { ButtonLink, EmptyState, PageHeader } from "@/components/ui";

export default async function RecipientsPage() {
  const admin = await requireAdmin();
  const rows = await db.query.recipients.findMany({ where: eq(recipients.workspaceId, admin.workspaceId), limit: 100, orderBy: (table, { desc }) => [desc(table.createdAt)] });
  return (
    <>
      <PageHeader title="Recipients" action={<ButtonLink href="/imports/new">Import recipients</ButtonLink>} />
      {rows.length === 0 ? (
        <div className="grid gap-4">
          <EmptyState
            title="No recipients yet"
            detail="Recipients are added through CSV imports. Start by downloading the recipient template, filling it with emails, then uploading it on the import page."
          />
          <div className="flex flex-wrap gap-3 text-sm">
            <Link href="/imports/new" className="text-accent hover:underline">Open import page</Link>
            <Link href="/api/imports/template" className="text-accent hover:underline">Download CSV template</Link>
          </div>
        </div>
      ) : (
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
      )}
    </>
  );
}
