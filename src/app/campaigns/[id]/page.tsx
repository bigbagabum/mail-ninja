import Link from "next/link";
import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  campaignVariants,
  campaignWaves,
  campaigns,
  recipients,
} from "@/db/schema";
import { requireAdmin } from "@/server/auth/session";
import { Badge, PageHeader } from "@/components/ui";
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
  const waves = await db.query.campaignWaves.findMany({
    where: eq(campaignWaves.campaignId, id),
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
  const hasFallback = variants.some((variant) => variant.isFallback);
  const hasRequiredUnsubscribe =
    campaign.campaignType === "service_update" ||
    variants.some((variant) =>
      hasUnsubscribeLink(variant.htmlContent, variant.textContent),
    );
  const checklist = [
    {
      label: "Campaign settings saved",
      ok: Boolean(campaign.fromEmail && campaign.fromName),
      href: `/campaigns/${id}/edit`,
      action: "Open settings",
    },
    {
      label: "Fallback variant exists",
      ok: hasFallback,
      href: `/campaigns/${id}/variants`,
      action: "Add variant",
    },
    {
      label: "Unsubscribe link requirement",
      ok: hasRequiredUnsubscribe,
      href: `/campaigns/${id}/variants`,
      action: "Edit variants",
    },
    {
      label: "At least one wave exists",
      ok: waves.length > 0,
      href: `/campaigns/${id}/waves`,
      action: "Add waves",
    },
    {
      label: "Recipients available",
      ok: recipientCount.value > 0,
      href: "/recipients",
      action: "Add recipients",
    },
    {
      label: `Selected audience: ${selectedRecipients.length}`,
      ok: selectedRecipients.length > 0,
      href: `/campaigns/${id}/edit`,
      action: "Edit filters",
    },
    {
      label: "Audience filters reviewed",
      ok: true,
      href: `/campaigns/${id}/edit`,
      action: "Edit filters",
    },
  ];
  return (
    <>
      <PageHeader title={campaign.name} />
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
        <h2 className="font-semibold">Preparation checklist</h2>
        <div className="mt-3 grid gap-2">
          {checklist.map((item) => (
            <div
              key={item.label}
              className="flex flex-wrap items-center justify-between gap-3 rounded border border-line p-3 text-sm"
            >
              <div className="flex items-center gap-2">
                <Badge tone={item.ok ? "good" : "warn"}>
                  {item.ok ? "ok" : "needed"}
                </Badge>
                <span>{item.label}</span>
              </div>
              <Link href={item.href} className="text-accent hover:underline">
                {item.action}
              </Link>
            </div>
          ))}
        </div>
      </section>
      <PrepareCampaignButton campaignId={id} />
    </>
  );
}
