import Link from "next/link";

const links = [
  ["/recipients", "Recipients"],
  ["/imports", "Imports"],
  ["/suppressions", "Exclusions"],
  ["/settings/tags", "Tags"],
] as const;

export function AudienceNav() {
  return (
    <nav
      aria-label="Audience management"
      className="mb-6 flex flex-wrap gap-2 rounded border border-line bg-white p-2 text-sm"
    >
      {links.map(([href, label]) => (
        <Link
          key={href}
          href={href}
          className="rounded px-3 py-1.5 font-medium text-muted hover:bg-panel hover:text-ink"
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
