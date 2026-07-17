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
    <nav
      className="-mx-3 flex gap-2 overflow-x-auto border-y border-white/70 bg-white/45 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl md:mx-0 md:block md:space-y-1 md:overflow-visible md:rounded-xl md:border md:border-white/70 md:bg-white/35 md:p-2"
      aria-label="Primary navigation"
    >
      {nav.map(([href, label]) => {
        const isActive = active === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={
              isActive
                ? "block shrink-0 whitespace-nowrap rounded-lg border border-white/80 bg-white/80 px-3 py-2 text-sm font-medium text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_8px_20px_rgba(15,118,110,0.12)] backdrop-blur-xl"
                : "block shrink-0 whitespace-nowrap rounded-lg border border-transparent px-3 py-2 text-sm text-muted transition hover:border-white/70 hover:bg-white/55 hover:text-ink hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            }
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
