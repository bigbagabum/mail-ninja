import { and, eq, isNull } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { campaignVariants, emailTemplates } from "@/db/schema";
import { requireAdmin } from "@/server/auth/session";
import { CampaignTabs } from "@/components/campaign-tabs";
import { EmailTemplateEditor } from "@/components/email-template-editor";
import { PageHeader } from "@/components/ui";
import { createVariantAction } from "../../actions";
import {
  attachEmailTemplateToCampaignAction,
  detachCampaignTemplateAction,
} from "./actions";

export default async function VariantsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ template?: string }>;
}) {
  const admin = await requireAdmin();
  const { id } = await params;
  const query = searchParams ? await searchParams : {};
  const rows = await db.query.campaignVariants.findMany({
    where: eq(campaignVariants.campaignId, id),
    orderBy: (table, { asc }) => [asc(table.createdAt), asc(table.id)],
  });
  const reusableTemplates = await db.query.emailTemplates.findMany({
    where: and(
      eq(emailTemplates.workspaceId, admin.workspaceId),
      isNull(emailTemplates.deletedAt),
    ),
    orderBy: (table, { asc }) => [asc(table.name)],
  });
  const selectedTemplate =
    rows.find((variant) => variant.id === query.template) ?? null;
  return (
    <>
      <PageHeader title="Email Templates" />
      <CampaignTabs id={id} />
      <div className="grid gap-6 lg:grid-cols-[1fr_520px]">
        <div className="space-y-4">
          <section className="rounded border border-line bg-white p-4">
            <h2 className="font-semibold">Use reusable template</h2>
            <p className="mt-1 text-sm text-muted">
              Choose a library template and copy it into this campaign. The
              copied campaign template can then be edited safely for this send.
            </p>
            <form
              action={attachEmailTemplateToCampaignAction}
              className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]"
            >
              <input type="hidden" name="campaignId" value={id} />
              <select
                name="templateId"
                required
                className="rounded border-line text-sm"
                defaultValue=""
              >
                <option value="" disabled>
                  Select reusable template
                </option>
                {reusableTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name} · {template.locale} ·{" "}
                    {template.recipientRole}
                  </option>
                ))}
              </select>
              <button
                disabled={reusableTemplates.length === 0}
                className="rounded bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Add to campaign
              </button>
            </form>
            {reusableTemplates.length === 0 ? (
              <Link
                href="/templates"
                className="mt-3 inline-flex text-sm font-medium text-accent hover:underline"
              >
                Create reusable template
              </Link>
            ) : null}
          </section>

          <div className="rounded border border-line bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-panel text-muted">
                <tr>
                  <th className="p-3">Campaign template</th>
                  <th>Locale</th>
                  <th>Tag / audience</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((variant) => (
                  <tr
                    key={variant.id}
                    className={
                      selectedTemplate?.id === variant.id
                        ? "border-t border-line bg-teal-50/60"
                        : "border-t border-line"
                    }
                  >
                    <td className="p-3">{variant.name}</td>
                    <td>{variant.locale}</td>
                    <td>{variant.recipientRole}</td>
                    <td className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/campaigns/${id}/variants?template=${variant.id}`}
                          className="rounded border border-line px-2.5 py-1.5 text-xs font-medium hover:bg-panel"
                        >
                          Edit
                        </Link>
                        <form action={detachCampaignTemplateAction}>
                          <input type="hidden" name="campaignId" value={id} />
                          <input
                            type="hidden"
                            name="variantId"
                            value={variant.id}
                          />
                          <button className="rounded border border-red-200 px-2.5 py-1.5 text-xs font-medium text-danger hover:bg-red-50">
                            Detach
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 ? (
                  <tr>
                    <td className="p-3 text-muted" colSpan={5}>
                      No campaign templates yet. Add one from the reusable
                      template library or create a campaign-specific template.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
        <form
          action={createVariantAction}
          className="grid gap-3 rounded border border-line bg-white p-4"
        >
          <input type="hidden" name="campaignId" value={id} />
          {selectedTemplate ? (
            <input type="hidden" name="variantId" value={selectedTemplate.id} />
          ) : null}
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">
              {selectedTemplate
                ? "Edit campaign template"
                : "Create campaign-specific template"}
            </h2>
            {selectedTemplate ? (
              <Link
                href={`/campaigns/${id}/variants`}
                className="text-sm text-muted hover:text-ink"
              >
                New campaign template
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
        </form>
      </div>
    </>
  );
}
