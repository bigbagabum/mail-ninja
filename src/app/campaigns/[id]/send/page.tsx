import { eq } from "drizzle-orm";
import { db } from "@/db";
import { campaignRecipients, campaignWaves } from "@/db/schema";
import { requireAdmin } from "@/server/auth/session";
import { CampaignTabs } from "@/components/campaign-tabs";
import { PageHeader, Badge } from "@/components/ui";
import { sendWaveAction } from "../../actions";

export default async function SendPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const waves = await db.query.campaignWaves.findMany({ where: eq(campaignWaves.campaignId, id), orderBy: (table, { asc }) => [asc(table.position)] });
  const recipients = await db.query.campaignRecipients.findMany({ where: eq(campaignRecipients.campaignId, id) });
  return (
    <>
      <PageHeader title="Send Campaign" />
      <CampaignTabs id={id} />
      <div className="space-y-4">
        {waves.map((wave) => {
          const count = recipients.filter((recipient) => recipient.waveId === wave.id && recipient.status !== "suppressed").length;
          const alreadySent = recipients.filter((recipient) => recipient.waveId === wave.id && recipient.sentAt).length;
          return (
            <form key={wave.id} action={sendWaveAction} className="rounded border border-line bg-white p-4">
              <input type="hidden" name="waveId" value={wave.id} />
              <div className="flex items-center justify-between"><div><h2 className="font-medium">{wave.name}</h2><p className="text-sm text-muted">{count} recipients, {alreadySent} already sent</p></div><Badge>{wave.status}</Badge></div>
              <p className="mt-3 text-sm text-warn">Confirm only after provider resources are ready. Completed or already sent broadcasts are guarded by database state.</p>
              <button disabled={count === 0 || alreadySent > 0} className="mt-3 rounded bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-50">Send {count} emails</button>
            </form>
          );
        })}
      </div>
    </>
  );
}
