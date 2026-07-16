import Link from "next/link";

export function CampaignTabs({ id }: { id: string }) {
  const tabs = [
    ["", "Overview"],
    ["/variants", "Variants"],
    ["/recipients", "Recipients"],
    ["/waves", "Waves"],
    ["/send", "Provider"],
    ["/analytics", "Analytics"],
    ["/events", "Events"],
    ["/edit", "Settings"]
  ];
  return (
    <div className="mb-5 flex flex-wrap gap-2 border-b border-line pb-3">
      {tabs.map(([suffix, label]) => <Link key={label} href={`/campaigns/${id}${suffix}`} className="rounded px-3 py-1.5 text-sm text-muted hover:bg-white hover:text-ink">{label}</Link>)}
    </div>
  );
}
