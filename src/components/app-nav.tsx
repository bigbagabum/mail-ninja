"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import {
  adaptiveGlassActive,
  adaptiveGlassIconButton,
  adaptiveGlassItem,
  adaptiveGlassSurface,
  useAdaptiveGlass
} from "@/components/magic/adaptive-glass";

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
  const mobileNavRef = useRef<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  useAdaptiveGlass(desktopNavRef, pathname);
  useAdaptiveGlass(mobileNavRef, `${pathname}:${open ? "open" : "closed"}`);
  const active = activeHref(pathname);
  const activeLabel = nav.find(([href]) => href === active)?.[1] ?? "Menu";
  return (
    <>
      <nav
        ref={mobileNavRef}
        className={adaptiveGlassSurface("w-full max-w-full min-w-0 rounded-[28px] border px-2 py-1.5 lg:hidden")}
        aria-label="Primary navigation"
      >
        <div className="relative z-10 flex items-center justify-between gap-2">
          <span className={adaptiveGlassActive("rounded-full px-3 py-1.5 text-sm font-semibold")}>{activeLabel}</span>
          <button
            type="button"
            aria-expanded={open}
            aria-controls="mobile-primary-navigation"
            onClick={() => setOpen((value) => !value)}
            className={adaptiveGlassIconButton("inline-flex h-9 items-center gap-2 rounded-full px-3 text-sm font-semibold transition")}
          >
            {open ? <X aria-hidden="true" className="h-4 w-4" /> : <Menu aria-hidden="true" className="h-4 w-4" />}
            Menu
          </button>
        </div>
        {open ? (
          <div id="mobile-primary-navigation" className="relative z-10 mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {nav.map(([href, label]) => {
              const isActive = active === href;
              return (
                <Link
                  key={href}
                  href={href}
                  data-adaptive-glass-sample
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => setOpen(false)}
                  className={
                    isActive
                      ? adaptiveGlassItem(adaptiveGlassActive("block rounded-full px-3 py-2 text-center text-sm font-semibold transition-all duration-200"))
                      : adaptiveGlassItem("block rounded-full px-3 py-2 text-center text-sm font-semibold transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent")
                  }
                >
                  {label}
                </Link>
              );
            })}
          </div>
        ) : null}
      </nav>
      <nav
        ref={desktopNavRef}
        className={adaptiveGlassSurface("hidden w-fit max-w-full min-w-0 flex-wrap justify-center gap-1.5 overflow-hidden rounded-[28px] border px-2 py-1.5 lg:flex")}
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
    </>
  );
}
