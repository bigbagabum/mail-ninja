import { eq } from "drizzle-orm";
import { db } from "@/db";
import { campaignVariants } from "@/db/schema";
import { requireAdmin } from "@/server/auth/session";
import { CampaignTabs } from "@/components/campaign-tabs";
import { PageHeader, Badge } from "@/components/ui";
import { createVariantAction } from "../../actions";

export default async function VariantsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const rows = await db.query.campaignVariants.findMany({
    where: eq(campaignVariants.campaignId, id),
    orderBy: (table, { asc }) => [asc(table.createdAt), asc(table.id)],
  });
  return (
    <>
      <PageHeader title="Email Templates" />
      <CampaignTabs id={id} />
      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <div className="rounded border border-line bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-panel text-muted">
              <tr>
                <th className="p-3">Template</th>
                <th>Locale</th>
                <th>Tag / audience</th>
                <th>Default</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((variant) => (
                <tr key={variant.id} className="border-t border-line">
                  <td className="p-3">{variant.name}</td>
                  <td>{variant.locale}</td>
                  <td>{variant.recipientRole}</td>
                  <td>
                    {variant.isFallback ? (
                      <Badge tone="good">default</Badge>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <form
          action={createVariantAction}
          className="grid gap-3 rounded border border-line bg-white p-4"
        >
          <input type="hidden" name="campaignId" value={id} />
          <label className="text-sm font-medium">
            Template name
            <input
              name="name"
              required
              className="mt-1 w-full rounded border-line"
            />
          </label>
          <label className="text-sm font-medium">
            Locale
            <input
              name="locale"
              defaultValue="en"
              required
              className="mt-1 w-full rounded border-line"
            />
          </label>
          <label className="text-sm font-medium">
            Tag / audience
            <input
              name="recipientRole"
              defaultValue="generic"
              required
              className="mt-1 w-full rounded border-line"
            />
          </label>
          <label className="text-sm font-medium">
            Subject
            <input
              name="subject"
              required
              className="mt-1 w-full rounded border-line"
            />
          </label>
          <label className="text-sm font-medium">
            Preview text
            <input
              name="previewText"
              className="mt-1 w-full rounded border-line"
            />
          </label>
          <label className="text-sm font-medium">
            HTML body
            <textarea
              name="htmlContent"
              required
              rows={7}
              className="mt-1 w-full rounded border-line"
            />
          </label>
          <label className="text-sm font-medium">
            Plain text body
            <textarea
              name="textContent"
              rows={5}
              className="mt-1 w-full rounded border-line"
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="isFallback"
              value="true"
              className="rounded border-line"
            />{" "}
            Use as default template when no more specific template matches
          </label>
          <button className="rounded bg-accent px-3 py-2 text-sm font-medium text-white">
            Save template
          </button>
        </form>
      </div>
    </>
  );
}
