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
import { updateCampaignAudienceAction } from "../../actions";

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
  const modeClass = (mode: typeof audienceMode) =>
    audienceMode === mode
      ? "border-emerald-300 bg-emerald-50 text-emerald-950 ring-1 ring-emerald-200"
      : "border-line bg-white";
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
      <form
        action={updateCampaignAudienceAction}
        className="mt-6 rounded border border-line bg-white p-5"
      >
        <input type="hidden" name="campaignId" value={id} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Audience selection</h2>
            <p className="mt-1 text-sm text-muted">
              Current: {audienceSummary}
            </p>
          </div>
          <Badge tone={selectedRecipients.length > 0 ? "good" : "warn"}>
            {selectedRecipients.length} selected
          </Badge>
        </div>
        <fieldset className="mt-4 grid gap-3 md:grid-cols-3">
          <label className={`rounded border p-3 text-sm ${modeClass("all")}`}>
            <input
              className="mr-2"
              name="audienceMode"
              type="radio"
              value="all"
              defaultChecked={audienceMode === "all"}
            />
            All recipients
            {audienceMode === "all" ? (
              <Badge tone="good">selected</Badge>
            ) : null}
          </label>
          <label
            className={`rounded border p-3 text-sm ${modeClass("segment")}`}
          >
            <input
              className="mr-2"
              name="audienceMode"
              type="radio"
              value="segment"
              defaultChecked={audienceMode === "segment"}
            />
            Saved segment
            {audienceMode === "segment" ? (
              <Badge tone="good">selected</Badge>
            ) : null}
          </label>
          <label
            className={`rounded border p-3 text-sm ${modeClass("manual")}`}
          >
            <input
              className="mr-2"
              name="audienceMode"
              type="radio"
              value="manual"
              defaultChecked={audienceMode === "manual"}
            />
            Manual selection
            {audienceMode === "manual" ? (
              <Badge tone="good">selected</Badge>
            ) : null}
          </label>
        </fieldset>
        <label className="mt-4 block text-sm font-medium">
          Segment
          <select
            name="segmentId"
            defaultValue={filters.segmentId ?? ""}
            className="mt-1 w-full rounded border-line"
          >
            <option value="">Choose segment</option>
            {segments.map((segment) => (
              <option key={segment.id} value={segment.id}>
                {segment.name} ({segment.segmentType})
                {segment.id === filters.segmentId ? " - selected" : ""}
              </option>
            ))}
          </select>
        </label>
        <div className="mt-4 rounded border border-line">
          <div className="border-b border-line bg-panel px-3 py-2 text-sm font-medium">
            Manual recipients
          </div>
          <div className="max-h-80 overflow-auto">
            {allRecipients.map((recipient) => (
              <label
                key={recipient.id}
                className="flex items-center gap-3 border-t border-line px-3 py-2 text-sm first:border-t-0"
              >
                <input
                  name="manualRecipientIds"
                  type="checkbox"
                  value={recipient.id}
                  defaultChecked={filters.manualRecipientIds.includes(
                    recipient.id,
                  )}
                  className="rounded border-line"
                />
                <span className="font-medium">{recipient.email}</span>
                <span className="text-muted">
                  {[recipient.firstName, recipient.lastName]
                    .filter(Boolean)
                    .join(" ")}
                </span>
              </label>
            ))}
            {allRecipients.length === 0 ? (
              <p className="p-3 text-sm text-muted">No recipients yet.</p>
            ) : null}
          </div>
        </div>
        <button className="mt-4 rounded bg-accent px-3 py-2 text-sm font-medium text-white">
          Save audience
        </button>
      </form>
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
