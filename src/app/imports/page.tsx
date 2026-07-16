import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { imports } from "@/db/schema";
import { requireAdmin } from "@/server/auth/session";
import { Badge, ButtonLink, PageHeader } from "@/components/ui";

export default async function ImportsPage() {
  const admin = await requireAdmin();
  const rows = await db.query.imports.findMany({ where: eq(imports.workspaceId, admin.workspaceId), orderBy: (table, { desc }) => [desc(table.createdAt)] });
  return (
    <>
      <PageHeader title="Imports" action={<ButtonLink href="/imports/new">Upload CSV</ButtonLink>} />
      <div className="rounded border border-line bg-white"><table className="w-full text-left text-sm"><thead className="bg-panel text-muted"><tr><th className="p-3">File</th><th>Status</th><th>Total</th><th>Valid</th><th>Invalid</th><th>Suppressed</th></tr></thead><tbody>{rows.map((imp) => <tr key={imp.id} className="border-t border-line"><td className="p-3"><Link className="font-medium hover:underline" href={`/imports/${imp.id}`}>{imp.originalFilename}</Link></td><td><Badge>{imp.status}</Badge></td><td>{imp.totalRows}</td><td>{imp.validRows}</td><td>{imp.invalidRows}</td><td>{imp.suppressedRows}</td></tr>)}</tbody></table></div>
    </>
  );
}
