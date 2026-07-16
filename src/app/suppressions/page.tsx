import { eq } from "drizzle-orm";
import { db } from "@/db";
import { suppressions } from "@/db/schema";
import { requireAdmin } from "@/server/auth/session";
import { Badge, PageHeader } from "@/components/ui";
import { addSuppressionAction } from "./actions";

export default async function SuppressionsPage() {
  const admin = await requireAdmin();
  const rows = await db.query.suppressions.findMany({ where: eq(suppressions.workspaceId, admin.workspaceId), orderBy: (table, { desc }) => [desc(table.createdAt)] });
  return (
    <>
      <PageHeader title="Suppressions" />
      <form action={addSuppressionAction} className="mb-6 grid gap-3 rounded border border-line bg-white p-4 md:grid-cols-[1fr_180px_120px_auto]">
        <input name="email" type="email" required placeholder="email@example.com" className="rounded border-line" />
        <select name="reason" className="rounded border-line"><option value="manual">manual</option><option value="hard_bounce">hard_bounce</option><option value="complaint">complaint</option><option value="unsubscribe">unsubscribe</option><option value="other">other</option></select>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isPermanent" value="true" className="rounded border-line" />Permanent</label>
        <button className="rounded bg-accent px-3 py-2 text-sm font-medium text-white">Add</button>
      </form>
      <div className="rounded border border-line bg-white"><table className="w-full text-left text-sm"><thead className="bg-panel text-muted"><tr><th className="p-3">Email</th><th>Reason</th><th>Source</th><th>Permanent</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-t border-line"><td className="p-3">{row.email}</td><td>{row.reason}</td><td>{row.source}</td><td>{row.isPermanent ? <Badge tone="warn">permanent</Badge> : <Badge>temporary</Badge>}</td></tr>)}</tbody></table></div>
    </>
  );
}
