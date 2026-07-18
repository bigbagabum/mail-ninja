import { eq } from "drizzle-orm";
import { db } from "@/db";
import { importRows, imports } from "@/db/schema";
import { requireAdmin } from "@/server/auth/session";
import { AudienceNav } from "@/components/audience-nav";
import { Badge, PageHeader } from "@/components/ui";
import { analyzeImportAction, applyImportAction } from "../actions";

export default async function ImportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const imp = await db.query.imports.findFirst({ where: eq(imports.id, id) });
  const rows = await db.query.importRows.findMany({
    where: eq(importRows.importId, id),
    limit: 100,
  });
  if (!imp) return <PageHeader title="Import not found" />;
  return (
    <>
      <PageHeader title={imp.originalFilename} />
      <AudienceNav />
      <div className="grid gap-4 md:grid-cols-5">
        <div className="rounded border border-line bg-white p-4">
          <div className="text-sm text-muted">Status</div>
          <Badge>{imp.status}</Badge>
        </div>
        <div className="rounded border border-line bg-white p-4">
          <div className="text-sm text-muted">Valid</div>
          <div className="text-xl font-semibold">{imp.validRows}</div>
        </div>
        <div className="rounded border border-line bg-white p-4">
          <div className="text-sm text-muted">Invalid</div>
          <div className="text-xl font-semibold">{imp.invalidRows}</div>
        </div>
        <div className="rounded border border-line bg-white p-4">
          <div className="text-sm text-muted">Duplicates</div>
          <div className="text-xl font-semibold">{imp.duplicateRows}</div>
        </div>
        <div className="rounded border border-line bg-white p-4">
          <div className="text-sm text-muted">Suppressed</div>
          <div className="text-xl font-semibold">{imp.suppressedRows}</div>
        </div>
      </div>
      <form
        action={analyzeImportAction}
        className="mt-6 grid max-w-2xl gap-3 rounded border border-line bg-white p-4"
      >
        <input type="hidden" name="importId" value={id} />
        <h2 className="font-medium">Column mapping</h2>
        <label className="text-sm">
          Email column
          <input
            name="email"
            defaultValue="email"
            className="mt-1 w-full rounded border-line"
          />
        </label>
        <label className="text-sm">
          First name column
          <input
            name="first_name"
            defaultValue="first_name"
            className="mt-1 w-full rounded border-line"
          />
        </label>
        <label className="text-sm">
          Last name column
          <input
            name="last_name"
            defaultValue="last_name"
            className="mt-1 w-full rounded border-line"
          />
        </label>
        <label className="text-sm">
          Role column
          <input
            name="role"
            defaultValue="role"
            className="mt-1 w-full rounded border-line"
          />
        </label>
        <label className="text-sm">
          Tags column
          <input
            name="tags"
            defaultValue="tags"
            className="mt-1 w-full rounded border-line"
          />
        </label>
        <p className="text-sm text-muted">
          Tags may be separated by comma, semicolon or pipe. Missing tags will
          be created automatically.
        </p>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="enablePriorityScoring"
            value="true"
            className="rounded border-line"
          />{" "}
          Auto-score priority cohorts during analysis
        </label>
        <button className="w-fit rounded bg-accent px-3 py-2 text-sm font-medium text-white">
          Analyze
        </button>
      </form>
      <form
        action={applyImportAction}
        className="mt-4 rounded border border-amber-200 bg-amber-50 p-4"
      >
        <input type="hidden" name="importId" value={id} />
        <label className="mr-3 text-sm">
          <input type="radio" name="mode" value="skip" defaultChecked /> Skip
          existing
        </label>
        <label className="text-sm">
          <input type="radio" name="mode" value="update" /> Update existing
        </label>
        <button className="ml-4 rounded bg-accent px-3 py-2 text-sm font-medium text-white">
          Apply import
        </button>
      </form>
      <div className="mt-6 rounded border border-line bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-panel text-muted">
            <tr>
              <th className="p-3">Row</th>
              <th>Status</th>
              <th>Errors</th>
              <th>Data</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-line">
                <td className="p-3">{row.rowNumber}</td>
                <td>
                  <Badge>{row.status}</Badge>
                </td>
                <td>{row.validationErrors.join(", ")}</td>
                <td className="max-w-md truncate">
                  {JSON.stringify(row.normalizedData)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
