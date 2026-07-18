import { eq } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { campaignRecipients, campaigns } from "@/db/schema";
import { requireAdmin } from "@/server/auth/session";
import { CampaignTabs } from "@/components/campaign-tabs";
import {
  PageHeader,
  Badge,
  ButtonLink,
  EmptyState,
  InfoNote,
} from "@/components/ui";
import { PrepareCampaignButton } from "@/components/prepare-campaign-button";
import {
  describeCampaignRecipientFilters,
  loadFilteredRecipients,
  parseCampaignRecipientFilters,
} from "@/server/campaigns/recipient-filters";

export default async function CampaignRecipientsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requireAdmin();
  const { id } = await params;
  const campaign = await db.query.campaigns.findFirst({
    where: eq(campaigns.id, id),
  });
  if (!campaign) return <PageHeader title="Campaign not found" />;
  const rows = await db.query.campaignRecipients.findMany({
    where: eq(campaignRecipients.campaignId, id),
    limit: 200,
  });
  const filters = parseCampaignRecipientFilters(campaign.metadata);
  const selectedRecipients = await loadFilteredRecipients(
    admin.workspaceId,
    filters,
  );
  const filterDescriptions = describeCampaignRecipientFilters(filters);
  return (
    <>
      <PageHeader
        title="Campaign Recipients"
        action={
          <>
            <ButtonLink href={`/campaigns/${id}/edit`}>
              Edit audience filters
            </ButtonLink>
            <ButtonLink href="/recipients">Add recipient</ButtonLink>
            <ButtonLink href="/imports/new">Import recipients</ButtonLink>
          </>
        }
      />
      <CampaignTabs id={id} />
      <InfoNote>
        Recipients are added to a campaign by selecting an audience, then
        preparing the campaign. The selected audience is copied into durable
        campaign recipients so later imports or edits do not silently change who
        receives this campaign.
      </InfoNote>
      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded border border-line bg-white p-4">
          <div className="text-sm text-muted">Selected audience</div>
          <div className="mt-2 text-2xl font-semibold">
            {selectedRecipients.length}
          </div>
        </div>
        <div className="rounded border border-line bg-white p-4">
          <div className="text-sm text-muted">Prepared recipients</div>
          <div className="mt-2 text-2xl font-semibold">{rows.length}</div>
        </div>
        <div className="rounded border border-line bg-white p-4">
          <div className="text-sm text-muted">Campaign status</div>
          <div className="mt-2">
            <Badge>{campaign.status}</Badge>
          </div>
        </div>
      </section>
      <section className="mt-4 rounded border border-line bg-white p-4 text-sm">
        <div className="font-medium">Current audience filters</div>
        {filterDescriptions.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {filterDescriptions.map((description) => (
              <Badge key={description}>{description}</Badge>
            ))}
          </div>
        ) : (
          <p className="mt-1 text-muted">
            No filters selected. Prepare will include all non-suppressed
            recipients.
          </p>
        )}
      </section>
      {rows.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            title={
              campaign.status === "draft"
                ? "No recipients prepared yet"
                : "No campaign recipients found"
            }
            detail={
              campaign.status === "draft"
                ? "Review the selected audience above, add an email template and waves, then prepare the campaign."
                : campaign.status === "preparing"
                  ? "Preparation is still running. Refresh this page in a moment."
                  : "Preparation completed without campaign recipients. Check recipient filters, suppressions, variants, and wave configuration."
            }
          />
          <div className="mt-3 flex gap-3 text-sm">
            <Link
              href={`/campaigns/${id}`}
              className="text-accent hover:underline"
            >
              Open overview
            </Link>
            <Link
              href={`/campaigns/${id}/variants`}
              className="text-accent hover:underline"
            >
              Check variants
            </Link>
            <Link
              href={`/campaigns/${id}/waves`}
              className="text-accent hover:underline"
            >
              Check waves
            </Link>
          </div>
          {campaign.status === "draft" || campaign.status === "preparing" ? (
            <PrepareCampaignButton campaignId={id} />
          ) : null}
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded border border-line bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-panel text-muted">
              <tr>
                <th className="p-3">Recipient</th>
                <th>Status</th>
                <th>Wave</th>
                <th>Opens</th>
                <th>Clicks</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-line">
                  <td className="p-3">{row.recipientId}</td>
                  <td>
                    <Badge>{row.status}</Badge>
                  </td>
                  <td>{row.waveId}</td>
                  <td>{row.openCount}</td>
                  <td>{row.clickCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
