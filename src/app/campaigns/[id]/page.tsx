import { eq } from "drizzle-orm";
import { db } from "@/db";
import { campaigns } from "@/db/schema";
import { requireAdmin } from "@/server/auth/session";
import { Badge, PageHeader } from "@/components/ui";
import { CampaignTabs } from "@/components/campaign-tabs";
import { PrepareCampaignButton } from "@/components/prepare-campaign-button";

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const campaign = await db.query.campaigns.findFirst({ where: eq(campaigns.id, id) });
  if (!campaign) return <PageHeader title="Campaign not found" />;
  return (
    <>
      <PageHeader title={campaign.name} />
      <CampaignTabs id={id} />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded border border-line bg-white p-4"><div className="text-sm text-muted">Status</div><div className="mt-2"><Badge>{campaign.status}</Badge></div></div>
        <div className="rounded border border-line bg-white p-4"><div className="text-sm text-muted">Type</div><div className="mt-2 font-medium">{campaign.campaignType}</div></div>
        <div className="rounded border border-line bg-white p-4"><div className="text-sm text-muted">Sender</div><div className="mt-2 font-medium">{campaign.fromName} &lt;{campaign.fromEmail}&gt;</div></div>
      </div>
      <PrepareCampaignButton campaignId={id} />
    </>
  );
}
