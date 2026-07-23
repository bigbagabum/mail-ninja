import { eq } from "drizzle-orm";
import { db } from "@/db";
import { campaignRecipients, campaignVariants, campaigns } from "@/db/schema";
import { requireAdmin } from "@/server/auth/session";
import { CampaignTabs } from "@/components/campaign-tabs";
import { PageHeader, Badge, InfoNote, ButtonLink } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import {
  launchCampaignAction,
  sendCampaignTestEmailAction,
} from "../../actions";

export default async function SendPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requireAdmin();
  const { id } = await params;
  const campaign = await db.query.campaigns.findFirst({
    where: eq(campaigns.id, id),
  });
  if (!campaign || campaign.workspaceId !== admin.workspaceId) {
    return <PageHeader title="Campaign not found" />;
  }
  const recipients = await db.query.campaignRecipients.findMany({
    where: eq(campaignRecipients.campaignId, id),
  });
  const variants = await db.query.campaignVariants.findMany({
    where: eq(campaignVariants.campaignId, id),
  });
  const sendableCount = recipients.filter(
    (recipient) =>
      !["suppressed", "excluded", "cancelled"].includes(recipient.status),
  ).length;
  const sentCount = recipients.filter((recipient) => recipient.sentAt).length;
  const canLaunch = campaign.status === "ready" && sendableCount > 0;
  return (
    <>
      <PageHeader
        title={`${campaign.name} Send & Test`}
        action={
          <Badge tone={canLaunch ? "good" : "warn"}>{campaign.status}</Badge>
        }
      />
      <CampaignTabs id={id} />
      {campaign.status !== "ready" ? (
        <div className="mb-4">
          <InfoNote>
            Prepare the campaign before launch. Test emails are still available
            as soon as the campaign has at least one variant and provider
            credentials are configured.
          </InfoNote>
        </div>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded border border-line bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold">Launch</h2>
              <p className="mt-1 text-sm text-muted">
                {sendableCount} prepared recipients, {sentCount} already sent
              </p>
            </div>
            <Badge tone={canLaunch ? "good" : "warn"}>{campaign.status}</Badge>
          </div>
          <InfoNote>
            Scheduled time is interpreted as UTC+0. Queued jobs are picked up by
            the worker process, so production needs the worker or an external
            cron runner active.
          </InfoNote>
          <form action={launchCampaignAction} className="mt-4 grid gap-4">
            <input type="hidden" name="campaignId" value={id} />
            <fieldset className="grid gap-3 sm:grid-cols-2">
              <label className="rounded border border-line p-3 text-sm">
                <input
                  className="mr-2"
                  type="radio"
                  name="sendMode"
                  value="now"
                  defaultChecked
                />
                Start now
              </label>
              <label className="rounded border border-line p-3 text-sm">
                <input
                  className="mr-2"
                  type="radio"
                  name="sendMode"
                  value="scheduled"
                />
                Schedule UTC+0
              </label>
            </fieldset>
            <label className="grid gap-1 text-sm">
              <span className="font-medium">UTC date and time</span>
              <input
                className="rounded border border-line px-3 py-2"
                name="scheduledAt"
                type="datetime-local"
              />
            </label>
            <SubmitButton
              disabled={!canLaunch}
              pendingLabel="Sending campaign..."
              className="w-fit rounded bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Queue campaign
            </SubmitButton>
            {!canLaunch ? (
              <ButtonLink href={`/campaigns/${id}`}>Open checklist</ButtonLink>
            ) : null}
          </form>
        </section>

        <section className="rounded border border-line bg-white p-5">
          <h2 className="font-semibold">Test email</h2>
          <p className="mt-1 text-sm text-muted">
            Sends one test with sample recipient data. Campaign metrics stay
            unchanged.
          </p>
          <form
            action={sendCampaignTestEmailAction}
            className="mt-4 grid gap-3"
          >
            <input type="hidden" name="campaignId" value={id} />
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Recipient email</span>
              <input
                className="rounded border border-line px-3 py-2"
                name="testEmail"
                placeholder="you@example.com"
                type="email"
                required
              />
            </label>
            <SubmitButton
              disabled={variants.length === 0}
              pendingLabel="Sending test..."
              className="w-fit rounded border border-line px-3 py-2 text-sm font-medium hover:bg-bg disabled:opacity-50"
            >
              Send test
            </SubmitButton>
          </form>
        </section>
      </div>
    </>
  );
}
