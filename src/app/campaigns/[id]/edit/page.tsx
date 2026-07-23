import { eq } from "drizzle-orm";
import { db } from "@/db";
import { audienceSegments, campaigns, recipientTags } from "@/db/schema";
import { PageHeader, Badge, ButtonLink } from "@/components/ui";
import { CampaignTabs } from "@/components/campaign-tabs";
import { requireAdmin } from "@/server/auth/session";
import { parseCampaignRecipientFilters } from "@/server/campaigns/recipient-filters";
import { tagColorClasses } from "@/lib/tags";
import { updateCampaignAction } from "../../actions";

export default async function CampaignEditPage({
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
  const tags = await db.query.recipientTags.findMany({
    where: eq(recipientTags.workspaceId, admin.workspaceId),
    orderBy: (table, { asc }) => [asc(table.name)],
  });
  const segments = await db.query.audienceSegments.findMany({
    where: eq(audienceSegments.workspaceId, admin.workspaceId),
    orderBy: (table, { asc }) => [asc(table.name)],
  });
  const filters = parseCampaignRecipientFilters(campaign.metadata);
  const prepared = campaign.status !== "draft";

  return (
    <>
      <PageHeader title={`${campaign.name} Settings`} />
      <CampaignTabs id={id} />
      <div className="mb-4 rounded border border-line bg-white p-4 text-sm">
        <div className="flex items-center gap-3">
          <span className="text-muted">Current status</span>
          <Badge>{campaign.status}</Badge>
        </div>
      </div>
      {prepared ? (
        <div className="mb-4 rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          This campaign has already left draft state. Changing sender, type,
          locale, or key can invalidate prepared recipients and provider
          resources. Rebuild preparation before sending.
        </div>
      ) : null}
      <form
        action={updateCampaignAction}
        className="grid max-w-2xl gap-4 rounded border border-line bg-white p-5"
      >
        <input type="hidden" name="campaignId" value={id} />
        <label className="text-sm font-medium">
          Name
          <input
            name="name"
            required
            defaultValue={campaign.name}
            className="mt-1 w-full rounded border-line"
          />
        </label>
        <label className="text-sm font-medium">
          Campaign key
          <input
            name="campaignKey"
            defaultValue={campaign.campaignKey}
            placeholder="newsletter-2026-07"
            maxLength={120}
            className="mt-1 w-full rounded border-line"
          />
          <span className="mt-1 block text-xs font-normal text-muted">
            Stable unique slug used for retries, analytics, and Resend resource
            names. Spaces, underscores, and uppercase letters are converted
            automatically.
          </span>
        </label>
        <label className="text-sm font-medium">
          Description
          <textarea
            name="description"
            defaultValue={campaign.description ?? ""}
            className="mt-1 w-full rounded border-line"
          />
        </label>
        <label className="text-sm font-medium">
          Type
          <select
            name="campaignType"
            defaultValue={campaign.campaignType}
            className="mt-1 w-full rounded border-line"
          >
            <option value="newsletter">Newsletter</option>
            <option value="marketing">Marketing</option>
            <option value="announcement">Announcement</option>
            <option value="service_update">Service update</option>
          </select>
        </label>
        <label className="text-sm font-medium">
          Default locale
          <input
            name="defaultLocale"
            required
            defaultValue={campaign.defaultLocale}
            className="mt-1 w-full rounded border-line"
          />
        </label>
        <label className="text-sm font-medium">
          From name
          <input
            name="fromName"
            required
            defaultValue={campaign.fromName}
            className="mt-1 w-full rounded border-line"
          />
        </label>
        <label className="text-sm font-medium">
          From email
          <input
            name="fromEmail"
            type="email"
            required
            defaultValue={campaign.fromEmail}
            className="mt-1 w-full rounded border-line"
          />
        </label>
        <label className="text-sm font-medium">
          Reply-to
          <input
            name="replyTo"
            type="email"
            defaultValue={campaign.replyTo ?? ""}
            className="mt-1 w-full rounded border-line"
          />
        </label>
        <fieldset className="rounded border border-line bg-panel p-4">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-muted">
            Audience
          </legend>
          <p className="mb-3 text-sm text-muted">
            Choose one segment for this campaign. Suppressions still win during
            preparation.
          </p>
          <label className="mb-4 block text-sm font-medium">
            Segment
            <select
              name="segmentId"
              defaultValue={filters.segmentId ?? ""}
              className="mt-1 w-full rounded border-line"
            >
              <option value="">All recipients</option>
              {segments.map((segment) => (
                <option key={segment.id} value={segment.id}>
                  {segment.name} ({segment.segmentType})
                </option>
              ))}
            </select>
          </label>
          <div className="mb-4">
            <ButtonLink href="/segments">Manage segments</ButtonLink>
          </div>
          <div className="border-t border-line pt-4">
            <p className="mb-3 text-sm text-muted">
              Legacy filters are still available for older campaigns. Prefer
              segments for new campaign audiences.
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm font-medium">
                Locale
                <input
                  name="filterLocale"
                  placeholder="Any locale"
                  defaultValue={filters.locale ?? ""}
                  className="mt-1 w-full rounded border-line"
                />
              </label>
              <label className="text-sm font-medium">
                Platform
                <input
                  name="filterPlatform"
                  placeholder="Any platform"
                  defaultValue={filters.platform ?? ""}
                  className="mt-1 w-full rounded border-line"
                />
              </label>
              <label className="text-sm font-medium">
                Email verified
                <select
                  name="filterEmailVerified"
                  defaultValue={
                    filters.emailVerified === null
                      ? ""
                      : String(filters.emailVerified)
                  }
                  className="mt-1 w-full rounded border-line"
                >
                  <option value="">Any</option>
                  <option value="true">Verified only</option>
                  <option value="false">Unverified only</option>
                </select>
              </label>
              <label className="text-sm font-medium">
                Marketing consent
                <select
                  name="filterMarketingConsent"
                  defaultValue={
                    filters.marketingConsent === null
                      ? ""
                      : String(filters.marketingConsent)
                  }
                  className="mt-1 w-full rounded border-line"
                >
                  <option value="">Any</option>
                  <option value="true">Consented only</option>
                  <option value="false">No consent only</option>
                </select>
              </label>
            </div>
            <div className="mt-4">
              <div className="text-sm font-medium">Tags</div>
              {tags.length === 0 ? (
                <p className="mt-1 text-sm text-muted">
                  No tags yet. Create tags in Settings / Tags, then return here.
                </p>
              ) : (
                <div className="mt-2 flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <label
                      key={tag.id}
                      className={`inline-flex cursor-pointer items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${tagColorClasses(tag.color)}`}
                    >
                      <input
                        name="tagSlugs"
                        type="checkbox"
                        value={tag.slug}
                        defaultChecked={filters.tagSlugs.includes(tag.slug)}
                        className="h-3.5 w-3.5 rounded border-line"
                      />
                      {tag.name}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </fieldset>
        <button className="w-fit rounded bg-accent px-3 py-2 text-sm font-medium text-white">
          Save campaign
        </button>
      </form>
    </>
  );
}
