"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { adaptiveGlassActive, adaptiveGlassItem, adaptiveGlassSurface, useAdaptiveGlass } from "@/components/magic/adaptive-glass";

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
  const desktopNavRef = useRef<HTMLElement | null>(null);
  useAdaptiveGlass(desktopNavRef, pathname);
  const active = activeHref(pathname);
  return (
    <nav
      ref={desktopNavRef}
      className={adaptiveGlassSurface("-mx-3 flex gap-2 overflow-x-auto rounded-none border-y px-3 py-2 md:mx-0 md:block md:space-y-1 md:overflow-visible md:rounded-[28px] md:border md:p-2")}
      aria-label="Primary navigation"
    >
      {nav.map(([href, label]) => {
        const isActive = active === href;
        return (
          <Link
            key={href}
            href={href}
            data-adaptive-glass-sample
            aria-current={isActive ? "page" : undefined}
            className={
              isActive
                ? adaptiveGlassItem(adaptiveGlassActive("relative z-10 block shrink-0 whitespace-nowrap rounded-full px-3 py-2 text-sm font-semibold transition-all duration-200"))
                : adaptiveGlassItem("relative z-10 block shrink-0 whitespace-nowrap rounded-full px-3 py-2 text-sm font-semibold transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent")
            }
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
