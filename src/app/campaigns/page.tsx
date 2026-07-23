import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { campaigns } from "@/db/schema";
import { requireAdmin } from "@/server/auth/session";
import { Badge, ButtonLink, PageHeader } from "@/components/ui";

export default async function CampaignsPage() {
  const admin = await requireAdmin();
  const rows = await db.query.campaigns.findMany({
    where: eq(campaigns.workspaceId, admin.workspaceId),
    orderBy: (table, { desc }) => [desc(table.createdAt)],
  });
  return (
    <>
      <PageHeader
        title="Campaigns"
        action={<ButtonLink href="/campaigns/new">New campaign</ButtonLink>}
      />
      <div className="overflow-hidden rounded border border-line bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-panel text-muted">
            <tr>
              <th className="p-3">Name</th>
              <th>Type</th>
              <th>Status</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((campaign) => (
              <tr key={campaign.id} className="border-t border-line">
                <td className="p-3">
                  <Link
                    className="font-medium hover:underline"
                    href={`/campaigns/${campaign.id}`}
                  >
                    {campaign.name}
                  </Link>
                </td>
                <td>{campaign.campaignType}</td>
                <td>
                  <Badge>{campaign.status}</Badge>
                </td>
                <td>{campaign.createdAt.toLocaleDateString()}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td className="p-3 text-muted" colSpan={4}>
                  No campaigns yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}
