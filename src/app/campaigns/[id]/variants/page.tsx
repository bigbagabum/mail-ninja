import { eq } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { campaignVariants } from "@/db/schema";
import { requireAdmin } from "@/server/auth/session";
import { CampaignTabs } from "@/components/campaign-tabs";
import { EmailTemplateEditor } from "@/components/email-template-editor";
import { PageHeader, Badge } from "@/components/ui";
import { createVariantAction } from "../../actions";

export default async function VariantsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ template?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const query = searchParams ? await searchParams : {};
  const rows = await db.query.campaignVariants.findMany({
    where: eq(campaignVariants.campaignId, id),
    orderBy: (table, { asc }) => [asc(table.createdAt), asc(table.id)],
  });
  const selectedTemplate =
    rows.find((variant) => variant.id === query.template) ?? null;
  return (
    <>
      <PageHeader title="Email Templates" />
      <CampaignTabs id={id} />
      <div className="grid gap-6 lg:grid-cols-[1fr_520px]">
        <div className="rounded border border-line bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-panel text-muted">
              <tr>
                <th className="p-3">Template</th>
                <th>Locale</th>
                <th>Tag / audience</th>
                <th>Default</th>
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
                  <td>
                    {variant.isFallback ? (
                      <Badge tone="good">default</Badge>
                    ) : null}
                  </td>
                  <td className="text-right">
                    <Link
                      href={`/campaigns/${id}/variants?template=${variant.id}`}
                      className="rounded border border-line px-2.5 py-1.5 text-xs font-medium hover:bg-panel"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td className="p-3 text-muted" colSpan={5}>
                    No templates yet. Create the first email template here.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
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
              {selectedTemplate ? "Edit template" : "Create template"}
            </h2>
            {selectedTemplate ? (
              <Link
                href={`/campaigns/${id}/variants`}
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
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="isFallback"
              value="true"
              defaultChecked={selectedTemplate?.isFallback ?? false}
              className="rounded border-line"
            />{" "}
            Use as default template when no more specific template matches
          </label>
          <button className="rounded bg-accent px-3 py-2 text-sm font-medium text-white">
            {selectedTemplate ? "Update template" : "Save template"}
          </button>
        </form>
      </div>
    </>
  );
}
