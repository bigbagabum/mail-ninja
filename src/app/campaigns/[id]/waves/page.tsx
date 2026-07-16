import { eq } from "drizzle-orm";
import { db } from "@/db";
import { campaignWaves } from "@/db/schema";
import { requireAdmin } from "@/server/auth/session";
import { CampaignTabs } from "@/components/campaign-tabs";
import { PageHeader, Badge } from "@/components/ui";
import { createWaveAction } from "../../actions";

export default async function WavesPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const rows = await db.query.campaignWaves.findMany({ where: eq(campaignWaves.campaignId, id), orderBy: (table, { asc }) => [asc(table.position)] });
  return (
    <>
      <PageHeader title="Campaign Waves" />
      <CampaignTabs id={id} />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="rounded border border-line bg-white">
          <table className="w-full text-left text-sm"><thead className="bg-panel text-muted"><tr><th className="p-3">Position</th><th>Name</th><th>Limit</th><th>Status</th></tr></thead><tbody>{rows.map((wave) => <tr key={wave.id} className="border-t border-line"><td className="p-3">{wave.position}</td><td>{wave.name}</td><td>{wave.recipientLimit ?? "remaining"}</td><td><Badge>{wave.status}</Badge></td></tr>)}</tbody></table>
        </div>
        <form action={createWaveAction} className="grid gap-3 rounded border border-line bg-white p-4">
          <input type="hidden" name="campaignId" value={id} />
          <label className="text-sm font-medium">Name<input name="name" required className="mt-1 w-full rounded border-line" /></label>
          <label className="text-sm font-medium">Position<input name="position" type="number" min="1" required className="mt-1 w-full rounded border-line" /></label>
          <label className="text-sm font-medium">Recipient limit<input name="recipientLimit" type="number" min="1" placeholder="remaining" className="mt-1 w-full rounded border-line" /></label>
          <button className="rounded bg-accent px-3 py-2 text-sm font-medium text-white">Save wave</button>
        </form>
      </div>
    </>
  );
}
