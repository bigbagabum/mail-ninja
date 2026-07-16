import { uploadImportAction } from "../actions";
import { requireAdmin } from "@/server/auth/session";
import { PageHeader } from "@/components/ui";
import { CopyButton } from "@/components/copy-button";
import { buildRecipientImportStructureText, recipientImportColumns, recipientImportCsvHeader } from "@/lib/imports/recipient-template";

export default async function NewImportPage() {
  await requireAdmin();
  const structureText = buildRecipientImportStructureText();
  return (
    <>
      <PageHeader title="Upload CSV" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,560px)_1fr]">
        <form action={uploadImportAction} className="rounded border border-line bg-white p-5">
          <label className="block text-sm font-medium">CSV file<input type="file" name="file" accept=".csv,text/csv" required className="mt-2 block w-full text-sm" /></label>
          <p className="mt-3 text-sm text-muted">UTF-8 CSV with comma or semicolon delimiter. Email is the only required mapped field.</p>
          <button className="mt-5 rounded bg-accent px-3 py-2 text-sm font-medium text-white">Upload</button>
        </form>

        <section className="rounded border border-line bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">Import Template</h2>
              <p className="mt-1 text-sm text-muted">Use this structure when exporting recipients from another database.</p>
            </div>
            <div className="flex gap-2">
              <a href="/api/imports/template" className="rounded bg-accent px-3 py-2 text-sm font-medium text-white">Download CSV</a>
              <CopyButton value={structureText} label="Copy structure" />
            </div>
          </div>
          <div className="mt-4 rounded border border-line bg-panel p-3">
            <div className="text-xs font-medium uppercase text-muted">CSV header</div>
            <code className="mt-1 block break-all text-sm">{recipientImportCsvHeader.join(",")}</code>
          </div>
          <div className="mt-4 overflow-hidden rounded border border-line">
            <table className="w-full text-left text-sm">
              <thead className="bg-panel text-muted">
                <tr><th className="p-2">Column</th><th>Required</th><th>Type</th></tr>
              </thead>
              <tbody>
                {recipientImportColumns.map((column) => (
                  <tr key={column.name} className="border-t border-line">
                    <td className="p-2 font-medium">{column.name}</td>
                    <td>{column.required ? "yes" : "no"}</td>
                    <td>{column.type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
