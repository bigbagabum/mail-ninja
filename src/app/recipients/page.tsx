import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { recipients } from "@/db/schema";
import { requireAdmin } from "@/server/auth/session";
import { ButtonLink, EmptyState, PageHeader } from "@/components/ui";
import { addRecipientAction } from "./actions";

export default async function RecipientsPage() {
  const admin = await requireAdmin();
  const rows = await db.query.recipients.findMany({ where: eq(recipients.workspaceId, admin.workspaceId), limit: 100, orderBy: (table, { desc }) => [desc(table.createdAt)] });
  return (
    <>
      <PageHeader title="Recipients" action={<ButtonLink href="/imports/new">Import recipients</ButtonLink>} />
      <form action={addRecipientAction} className="mb-6 grid gap-3 rounded border border-line bg-white p-4 lg:grid-cols-[minmax(180px,1fr)_140px_140px_120px_120px_140px_auto]">
        <input name="email" type="email" required placeholder="email@example.com" className="rounded border-line text-sm" />
        <input name="firstName" placeholder="First name" className="rounded border-line text-sm" />
        <input name="lastName" placeholder="Last name" className="rounded border-line text-sm" />
        <input name="locale" placeholder="en" className="rounded border-line text-sm" />
        <input name="role" placeholder="role" className="rounded border-line text-sm" />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="marketingConsent" value="true" className="rounded border-line" />Consent</label>
        <button className="rounded bg-accent px-3 py-2 text-sm font-medium text-white">Add recipient</button>
      </form>
      {rows.length === 0 ? (
        <div className="grid gap-4">
          <EmptyState
            title="No recipients yet"
            detail="Recipients can be added manually here or imported in bulk through CSV uploads."
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
