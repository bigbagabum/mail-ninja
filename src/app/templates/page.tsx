import { and, eq, isNull } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { emailTemplates } from "@/db/schema";
import { EmailTemplateEditor } from "@/components/email-template-editor";
import { Badge, EmptyState, PageHeader } from "@/components/ui";
import { requireAdmin } from "@/server/auth/session";
import { deleteEmailTemplateAction, saveEmailTemplateAction } from "./actions";

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams?: Promise<{ template?: string }>;
}) {
  const admin = await requireAdmin();
  const query = searchParams ? await searchParams : {};
  const rows = await db.query.emailTemplates.findMany({
    where: and(
      eq(emailTemplates.workspaceId, admin.workspaceId),
      isNull(emailTemplates.deletedAt),
    ),
    orderBy: (table, { desc }) => [desc(table.updatedAt)],
  });
  const selectedTemplate =
    rows.find((template) => template.id === query.template) ?? null;

  return (
    <>
      <PageHeader title="Templates" />
      <div className="mb-5 rounded border border-blue-100 bg-blue-50 p-4 text-sm text-blue-950">
        Templates are reusable email drafts. They are not attached to any
        campaign until you choose one inside a campaign.
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_520px]">
        <div className="overflow-hidden rounded border border-line bg-white">
          {rows.length === 0 ? (
            <EmptyState
              title="No templates yet"
              detail="Create a reusable template here, then connect it from a campaign."
            />
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-panel text-muted">
                <tr>
                  <th className="p-3">Template</th>
                  <th>Locale</th>
                  <th>Tag / audience</th>
                  <th>Updated</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((template) => (
                  <tr
                    key={template.id}
                    className={
                      selectedTemplate?.id === template.id
                        ? "border-t border-line bg-teal-50/60"
                        : "border-t border-line"
                    }
                  >
                    <td className="p-3">
                      <div className="font-medium">{template.name}</div>
                      <div className="mt-1 font-mono text-xs text-muted">
                        {template.slug}
                      </div>
                    </td>
                    <td>{template.locale}</td>
                    <td>{template.recipientRole}</td>
                    <td>{template.updatedAt.toLocaleString()}</td>
                    <td className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/templates?template=${template.id}`}
                          className="rounded border border-line px-2.5 py-1.5 text-xs font-medium hover:bg-panel"
                        >
                          Edit
                        </Link>
                        <form action={deleteEmailTemplateAction}>
                          <input
                            type="hidden"
                            name="templateId"
                            value={template.id}
                          />
                          <button className="rounded border border-red-200 px-2.5 py-1.5 text-xs font-medium text-danger hover:bg-red-50">
                            Delete
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <form
          action={saveEmailTemplateAction}
          className="grid gap-3 rounded border border-line bg-white p-4"
        >
          {selectedTemplate ? (
            <input
              type="hidden"
              name="templateId"
              value={selectedTemplate.id}
            />
          ) : null}
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">
              {selectedTemplate ? "Edit reusable template" : "Create template"}
            </h2>
            {selectedTemplate ? (
              <Link
                href="/templates"
                className="text-sm text-muted hover:text-ink"
              >
                New template
              </Link>
            ) : null}
          </div>
          <label className="text-sm font-medium">
            Template name
            <input
              name="name"
              required
              defaultValue={selectedTemplate?.name ?? ""}
              className="mt-1 w-full rounded border-line"
            />
          </label>
          <label className="text-sm font-medium">
            Template key
            <input
              name="slug"
              placeholder="welcome-newsletter"
              defaultValue={selectedTemplate?.slug ?? ""}
              className="mt-1 w-full rounded border-line"
            />
            <span className="mt-1 block text-xs font-normal text-muted">
              Stable internal name. Leave empty to generate it from the template
              name.
            </span>
          </label>
          <label className="text-sm font-medium">
            Description
            <textarea
              name="description"
              defaultValue={selectedTemplate?.description ?? ""}
              className="mt-1 w-full rounded border-line"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium">
              Locale
              <input
                name="locale"
                defaultValue={selectedTemplate?.locale ?? "en"}
                required
                className="mt-1 w-full rounded border-line"
              />
            </label>
            <label className="text-sm font-medium">
              Tag / audience
              <input
                name="recipientRole"
                defaultValue={selectedTemplate?.recipientRole ?? "generic"}
                required
                className="mt-1 w-full rounded border-line"
              />
            </label>
          </div>
          <label className="text-sm font-medium">
            Subject
            <input
              name="subject"
              required
              defaultValue={selectedTemplate?.subject ?? ""}
              className="mt-1 w-full rounded border-line"
            />
          </label>
          <label className="text-sm font-medium">
            Preview text
            <input
              name="previewText"
              defaultValue={selectedTemplate?.previewText ?? ""}
              className="mt-1 w-full rounded border-line"
            />
          </label>
          <EmailTemplateEditor
            initialHtml={selectedTemplate?.htmlContent}
            initialText={selectedTemplate?.textContent}
          />
          <button className="rounded bg-accent px-3 py-2 text-sm font-medium text-white">
            {selectedTemplate ? "Update template" : "Save template"}
          </button>
          {selectedTemplate ? (
            <Badge tone="neutral">
              Campaigns use a copy. Updating this library template will not
              rewrite existing campaign templates.
            </Badge>
          ) : null}
        </form>
      </div>
    </>
  );
}
