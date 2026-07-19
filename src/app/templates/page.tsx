import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { campaigns, campaignVariants } from "@/db/schema";
import { requireAdmin } from "@/server/auth/session";
import { Badge, ButtonLink, EmptyState, PageHeader } from "@/components/ui";

export default async function TemplatesPage() {
  const admin = await requireAdmin();
  const rows = await db
    .select({
      id: campaignVariants.id,
      name: campaignVariants.name,
      locale: campaignVariants.locale,
      recipientRole: campaignVariants.recipientRole,
      isFallback: campaignVariants.isFallback,
      updatedAt: campaignVariants.updatedAt,
      campaignId: campaigns.id,
      campaignName: campaigns.name,
      campaignStatus: campaigns.status,
    })
    .from(campaignVariants)
    .innerJoin(campaigns, eq(campaignVariants.campaignId, campaigns.id))
    .where(eq(campaigns.workspaceId, admin.workspaceId))
    .orderBy(desc(campaignVariants.updatedAt));

  return (
    <>
      <PageHeader
        title="Templates"
        action={<ButtonLink href="/campaigns">Choose campaign</ButtonLink>}
      />
      <div className="mb-5 rounded border border-blue-100 bg-blue-50 p-4 text-sm text-blue-950">
        Templates are currently saved inside campaigns. This page is a central
        index so you can find and edit them without first opening the campaign.
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No templates yet"
          detail="Create a campaign first, then add its first email template."
        />
      ) : (
        <div className="overflow-hidden rounded border border-line bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-panel text-muted">
              <tr>
                <th className="p-3">Template</th>
                <th>Campaign</th>
                <th>Locale</th>
                <th>Tag / audience</th>
                <th>Default</th>
                <th>Updated</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((template) => (
                <tr key={template.id} className="border-t border-line">
                  <td className="p-3 font-medium">{template.name}</td>
                  <td>
                    <Link
                      href={`/campaigns/${template.campaignId}`}
                      className="hover:underline"
                    >
                      {template.campaignName}
                    </Link>
                    <div className="mt-1 text-xs text-muted">
                      {template.campaignStatus}
                    </div>
                  </td>
                  <td>{template.locale}</td>
                  <td>{template.recipientRole}</td>
                  <td>
                    {template.isFallback ? (
                      <Badge tone="good">default</Badge>
                    ) : (
                      <span className="text-muted">-</span>
                    )}
                  </td>
                  <td>{template.updatedAt.toLocaleString()}</td>
                  <td className="text-right">
                    <Link
                      href={`/campaigns/${template.campaignId}/variants?template=${template.id}`}
                      className="rounded border border-line px-2.5 py-1.5 text-xs font-medium hover:bg-panel"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
