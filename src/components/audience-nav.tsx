"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  ["/recipients", "Recipients"],
  ["/imports", "Imports"],
  ["/suppressions", "Exclusions"],
] as const;

export function AudienceNav() {
  const pathname = usePathname();
  return (
    <div className="mb-6 flex flex-col gap-3 rounded-[30px] border border-white/60 bg-slate-300/70 p-2 shadow-sm backdrop-blur md:flex-row md:items-center md:justify-between">
      <nav
        aria-label="Audience management"
        className="grid grid-cols-3 gap-1 rounded-[24px] text-sm font-semibold md:inline-grid md:w-fit"
      >
        {links.map(([href, label]) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={
                active
                  ? "rounded-full bg-white px-4 py-2.5 text-center text-ink shadow-sm"
                  : "rounded-full px-4 py-2.5 text-center text-white/90 drop-shadow-sm transition hover:bg-white/25 hover:text-ink"
              }
            >
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="flex justify-center md:justify-end">
        <Link
          href="/settings/tags"
          className="rounded-full px-3 py-1.5 text-sm font-semibold text-white/90 drop-shadow-sm transition hover:bg-white/25 hover:text-ink"
        >
          Manage tags
        </Link>
      </div>
    </div>
  );
}
