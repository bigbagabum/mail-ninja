import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { campaignVariants, emailTemplates } from "@/db/schema";
import { requireAdmin } from "@/server/auth/session";
import { CampaignTabs } from "@/components/campaign-tabs";
import { PageHeader } from "@/components/ui";
import { isMissingEmailTemplatesSchemaError } from "@/lib/db-errors";
import {
  attachEmailTemplateToCampaignAction,
  detachCampaignTemplateAction,
} from "./actions";

export default async function VariantsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requireAdmin();
  const { id } = await params;
  const rows = await db.query.campaignVariants.findMany({
    where: eq(campaignVariants.campaignId, id),
    orderBy: (table, { asc }) => [asc(table.createdAt), asc(table.id)],
  });
  const reusableTemplates = await db.query.emailTemplates
    .findMany({
      where: and(
        eq(emailTemplates.workspaceId, admin.workspaceId),
        isNull(emailTemplates.deletedAt),
      ),
      orderBy: (table, { asc }) => [asc(table.name)],
    })
    .catch((error: unknown) => {
      if (isMissingEmailTemplatesSchemaError(error)) return null;
      throw error;
    });
  const templateLibraryUnavailable = reusableTemplates === null;
  return (
    <>
      <PageHeader title="Email Templates" />
      <CampaignTabs id={id} />
      <div className="space-y-4">
        <section className="rounded border border-line bg-white p-4">
          <h2 className="font-semibold">Use reusable template</h2>
          <p className="mt-1 text-sm text-muted">
            Choose an existing library template for this campaign. Create and
            edit reusable templates in the Templates section.
          </p>
          {templateLibraryUnavailable ? (
            <div className="mt-3 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
              Reusable templates need database migrations before they can be
              used. Apply{" "}
              <span className="font-mono text-xs">
                drizzle/0006_email_templates.sql
              </span>{" "}
              and{" "}
              <span className="font-mono text-xs">
                drizzle/0007_soft_delete_email_templates.sql
              </span>
              .
            </div>
          ) : null}
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
              disabled={templateLibraryUnavailable}
            >
              <option value="" disabled>
                {templateLibraryUnavailable
                  ? "Template library unavailable"
                  : "Select reusable template"}
              </option>
              {(reusableTemplates ?? []).map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name} · {template.locale} · {template.recipientRole}
                </option>
              ))}
            </select>
            <button
              disabled={
                templateLibraryUnavailable ||
                (reusableTemplates?.length ?? 0) === 0
              }
              className="rounded bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Add to campaign
            </button>
          </form>
          {!templateLibraryUnavailable && reusableTemplates.length === 0 ? (
            <p className="mt-3 text-sm text-muted">
              No reusable templates are available yet.
            </p>
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
                <tr key={variant.id} className="border-t border-line">
                  <td className="p-3">{variant.name}</td>
                  <td>{variant.locale}</td>
                  <td>{variant.recipientRole}</td>
                  <td className="text-right">
                    <div className="flex justify-end gap-2">
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
                  <td className="p-3 text-muted" colSpan={4}>
                    No template selected yet. Choose one from the reusable
                    template library.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
