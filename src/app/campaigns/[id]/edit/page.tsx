import { eq } from "drizzle-orm";
import { db } from "@/db";
import { campaigns } from "@/db/schema";
import { PageHeader, Badge } from "@/components/ui";
import { CampaignTabs } from "@/components/campaign-tabs";
import { requireAdmin } from "@/server/auth/session";
import { updateCampaignAction } from "../../actions";

export default async function CampaignEditPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const campaign = await db.query.campaigns.findFirst({ where: eq(campaigns.id, id) });
  if (!campaign) return <PageHeader title="Campaign not found" />;
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
          This campaign has already left draft state. Changing sender, type, locale, or key can invalidate prepared recipients and provider resources. Rebuild preparation before sending.
        </div>
      ) : null}
      <form action={updateCampaignAction} className="grid max-w-2xl gap-4 rounded border border-line bg-white p-5">
        <input type="hidden" name="campaignId" value={id} />
        <label className="text-sm font-medium">Name<input name="name" required defaultValue={campaign.name} className="mt-1 w-full rounded border-line" /></label>
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
            Stable unique slug used for retries, analytics, and Resend resource names. Spaces, underscores, and uppercase letters are converted automatically.
          </span>
        </label>
        <label className="text-sm font-medium">Description<textarea name="description" defaultValue={campaign.description ?? ""} className="mt-1 w-full rounded border-line" /></label>
        <label className="text-sm font-medium">Type<select name="campaignType" defaultValue={campaign.campaignType} className="mt-1 w-full rounded border-line"><option value="newsletter">Newsletter</option><option value="marketing">Marketing</option><option value="announcement">Announcement</option><option value="service_update">Service update</option></select></label>
        <label className="text-sm font-medium">Default locale<input name="defaultLocale" required defaultValue={campaign.defaultLocale} className="mt-1 w-full rounded border-line" /></label>
        <label className="text-sm font-medium">From name<input name="fromName" required defaultValue={campaign.fromName} className="mt-1 w-full rounded border-line" /></label>
        <label className="text-sm font-medium">From email<input name="fromEmail" type="email" required defaultValue={campaign.fromEmail} className="mt-1 w-full rounded border-line" /></label>
        <label className="text-sm font-medium">Reply-to<input name="replyTo" type="email" defaultValue={campaign.replyTo ?? ""} className="mt-1 w-full rounded border-line" /></label>
        <button className="w-fit rounded bg-accent px-3 py-2 text-sm font-medium text-white">Save campaign</button>
      </form>
    </>
  );
}
