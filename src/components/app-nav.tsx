"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  ["/dashboard", "Dashboard"],
  ["/campaigns", "Campaigns"],
  ["/recipients", "Recipients"],
  ["/imports", "Imports"],
  ["/suppressions", "Suppressions"],
  ["/events", "Events"],
  ["/jobs", "Jobs"],
  ["/settings", "Settings"],
  ["/settings/providers", "Provider Keys"],
  ["/settings/admins", "Admins"]
] as const;

function activeHref(pathname: string) {
  return nav
    .map(([href]) => href)
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];
}

export function AppNav() {
  const pathname = usePathname();
  const active = activeHref(pathname);
  return (
    <nav className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 md:mx-0 md:block md:space-y-1 md:overflow-visible md:px-0 md:pb-0" aria-label="Primary navigation">
      {nav.map(([href, label]) => {
        const isActive = active === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={
              isActive
                ? "block shrink-0 whitespace-nowrap rounded border border-accent/30 bg-white px-3 py-2 text-sm font-medium text-ink shadow-sm"
                : "block shrink-0 whitespace-nowrap rounded px-3 py-2 text-sm text-muted hover:bg-white hover:text-ink"
            }
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
