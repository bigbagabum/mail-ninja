import Link from "next/link";
import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import { campaignVariants, campaigns, recipients } from "@/db/schema";
import { requireAdmin } from "@/server/auth/session";
import { Badge, ButtonLink, PageHeader } from "@/components/ui";
import { CampaignTabs } from "@/components/campaign-tabs";
import { PrepareCampaignButton } from "@/components/prepare-campaign-button";
import { hasUnsubscribeLink } from "@/lib/templates";
import {
  loadFilteredRecipients,
  parseCampaignRecipientFilters,
} from "@/server/campaigns/recipient-filters";

export default async function CampaignPage({
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
  const variants = await db.query.campaignVariants.findMany({
    where: eq(campaignVariants.campaignId, id),
  });
  const [recipientCount] = await db
    .select({ value: count() })
    .from(recipients)
    .where(eq(recipients.workspaceId, admin.workspaceId));
  const recipientFilters = parseCampaignRecipientFilters(campaign.metadata);
  const selectedRecipients = await loadFilteredRecipients(
    admin.workspaceId,
    recipientFilters,
  );
  const hasTemplate = variants.length > 0;
  const hasRequiredUnsubscribe =
    campaign.campaignType === "service_update" ||
    variants.some((variant) =>
      hasUnsubscribeLink(variant.htmlContent, variant.textContent),
    );
  const checklist = [
    {
      label: "Settings",
      detail: `${campaign.fromName} <${campaign.fromEmail}>`,
      ok: Boolean(campaign.fromEmail && campaign.fromName),
      href: `/campaigns/${id}/edit`,
      action: "Review",
    },
    {
      label: "Template",
      detail:
        variants.length === 1
          ? variants[0].name
          : `${variants.length} variants`,
      ok: hasTemplate,
      href: `/campaigns/${id}/variants`,
      action: hasTemplate ? "Review" : "Add template",
    },
    ...(campaign.campaignType === "service_update"
      ? []
      : [
          {
            label: "Unsubscribe",
            detail: hasRequiredUnsubscribe
              ? "Link present"
              : "Required before sending",
            ok: hasRequiredUnsubscribe,
            href: `/campaigns/${id}/variants`,
            action: hasRequiredUnsubscribe ? "Review" : "Add link",
          },
        ]),
    {
      label: "Recipients",
      detail: `${selectedRecipients.length} selected`,
      ok: selectedRecipients.length > 0,
      href: `/campaigns/${id}/recipients`,
      action:
        selectedRecipients.length > 0
          ? "Review"
          : recipientCount.value > 0
            ? "Choose"
            : "Add recipients",
    },
  ];
  const readyToPrepare = checklist.every((item) => item.ok);
  return (
    <>
      <PageHeader
        title={campaign.name}
        action={
          <ButtonLink href={`/campaigns/${id}/send`}>Send & Test</ButtonLink>
        }
      />
      <CampaignTabs id={id} />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded border border-line bg-white p-4">
          <div className="text-sm text-muted">Status</div>
          <div className="mt-2">
            <Badge>{campaign.status}</Badge>
          </div>
        </div>
        <div className="rounded border border-line bg-white p-4">
          <div className="text-sm text-muted">Type</div>
          <div className="mt-2 font-medium">{campaign.campaignType}</div>
        </div>
        <div className="rounded border border-line bg-white p-4">
          <div className="text-sm text-muted">Sender</div>
          <div className="mt-2 font-medium">
            {campaign.fromName} &lt;{campaign.fromEmail}&gt;
          </div>
        </div>
      </div>
      <section className="mt-6 rounded border border-line bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">Setup</h2>
          <Badge tone={readyToPrepare ? "good" : "warn"}>
            {readyToPrepare ? "ready" : "needs attention"}
          </Badge>
        </div>
        <div className="mt-3 grid gap-2">
          {checklist.map((item) => (
            <div
              key={item.label}
              className="flex flex-wrap items-center justify-between gap-3 rounded border border-line px-3 py-2.5 text-sm"
            >
              <div className="min-w-0">
                <div className="font-medium">{item.label}</div>
                <div className={item.ok ? "text-muted" : "text-amber-800"}>
                  {item.detail}
                </div>
              </div>
              <Link href={item.href} className="text-accent hover:underline">
                {item.action}
              </Link>
            </div>
          ))}
        </div>
      </section>
      {campaign.metadata?.preparationInvalidated ? (
        <div className="mt-4 rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Audience changed after preparation. Prepare again before sending.
        </div>
      ) : null}
      <PrepareCampaignButton campaignId={id} />
    </>
  );
}
