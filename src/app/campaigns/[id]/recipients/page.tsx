import { eq } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import {
  audienceSegments,
  campaignRecipients,
  campaigns,
  recipients,
} from "@/db/schema";
import { requireAdmin } from "@/server/auth/session";
import { CampaignAudienceForm } from "@/components/campaign-audience-form";
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
  const rows = await db
    .select({
      campaignRecipient: campaignRecipients,
      recipient: recipients,
    })
    .from(campaignRecipients)
    .innerJoin(recipients, eq(campaignRecipients.recipientId, recipients.id))
    .where(eq(campaignRecipients.campaignId, id))
    .limit(200);
  const filters = parseCampaignRecipientFilters(campaign.metadata);
  const [segments, allRecipients] = await Promise.all([
    db.query.audienceSegments.findMany({
      where: eq(audienceSegments.workspaceId, admin.workspaceId),
      orderBy: (table, { asc }) => [asc(table.name)],
    }),
    db.query.recipients.findMany({
      where: eq(recipients.workspaceId, admin.workspaceId),
      limit: 200,
      orderBy: (table, { desc }) => [desc(table.createdAt)],
    }),
  ]);
  const selectedRecipients = await loadFilteredRecipients(
    admin.workspaceId,
    filters,
  );
  const filterDescriptions = describeCampaignRecipientFilters(filters);
  const audienceMode = filters.segmentId
    ? "segment"
    : filters.manualRecipientIds.length > 0
      ? "manual"
      : "all";
  const selectedSegment = filters.segmentId
    ? segments.find((segment) => segment.id === filters.segmentId)
    : null;
  const audienceSummary =
    audienceMode === "segment"
      ? `Segment: ${selectedSegment?.name ?? "missing segment"}`
      : audienceMode === "manual"
        ? `Manual selection: ${filters.manualRecipientIds.length} recipients`
        : "All recipients";
  return (
    <>
      <PageHeader
        title="Campaign Recipients"
        action={
          <>
            <ButtonLink href="/segments">Manage segments</ButtonLink>
            <ButtonLink href="/recipients">Add recipient</ButtonLink>
            <ButtonLink href="/imports/new">Import recipients</ButtonLink>
          </>
        }
      />
      <CampaignTabs id={id} />
      <InfoNote>
        Choose who receives this campaign here. Use all recipients, one saved
        segment, or a manual selection. Suppressions are excluded during
        preparation.
      </InfoNote>
      <CampaignAudienceForm
        campaignId={id}
        initialMode={audienceMode}
        initialSegmentId={filters.segmentId ?? ""}
        initialManualRecipientIds={filters.manualRecipientIds}
        segments={segments.map((segment) => ({
          id: segment.id,
          name: segment.name,
          segmentType: segment.segmentType,
        }))}
        recipients={allRecipients.map((recipient) => ({
          id: recipient.id,
          email: recipient.email,
          name: [recipient.firstName, recipient.lastName]
            .filter(Boolean)
            .join(" "),
        }))}
        selectedCount={selectedRecipients.length}
        summary={audienceSummary}
      />
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
                ? "Review the selected audience above, add an email template, then prepare the campaign."
                : campaign.status === "preparing"
                  ? "Preparation is still running. Refresh this page in a moment."
                  : "Preparation completed without campaign recipients. Check recipient filters, suppressions, and variants."
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
                <th>Opens</th>
                <th>Clicks</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ campaignRecipient: row, recipient }) => (
                <tr key={row.id} className="border-t border-line">
                  <td className="p-3">
                    <div className="font-medium">{recipient.email}</div>
                    <div className="text-xs text-muted">
                      {[recipient.firstName, recipient.lastName]
                        .filter(Boolean)
                        .join(" ") ||
                        recipient.externalId ||
                        recipient.id}
                    </div>
                  </td>
                  <td>
                    <Badge tone={statusTone(row.status)}>{row.status}</Badge>
                  </td>
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

function statusTone(status: typeof campaignRecipients.$inferSelect.status) {
  if (["delivered", "opened", "clicked"].includes(status)) return "good";
  if (["bounced", "complained", "failed", "suppressed"].includes(status))
    return "bad";
  if (["unsubscribed", "delayed"].includes(status)) return "warn";
  return "neutral";
}
