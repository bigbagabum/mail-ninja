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
      className={adaptiveGlassSurface("flex w-full max-w-full min-w-0 flex-wrap justify-center gap-1.5 overflow-hidden rounded-[28px] border px-2 py-1.5 lg:w-fit")}
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
                ? adaptiveGlassItem(adaptiveGlassActive("relative z-10 block rounded-full px-3 py-1.5 text-sm font-semibold transition-all duration-200"))
                : adaptiveGlassItem("relative z-10 block rounded-full px-3 py-1.5 text-sm font-semibold transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent")
            }
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
