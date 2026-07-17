import Link from "next/link";
import type { ReactNode } from "react";

export function MailNinjaLogo({ showText = true }: { showText?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-white shadow-sm">
        <svg aria-hidden="true" viewBox="0 0 32 32" className="h-6 w-6">
          <path
            d="M6.5 11.5c0-1.2 1-2.2 2.2-2.2h14.6c1.2 0 2.2 1 2.2 2.2v9c0 1.2-1 2.2-2.2 2.2H8.7c-1.2 0-2.2-1-2.2-2.2v-9Z"
            fill="#F8FAFC"
          />
          <path d="m8.3 11.1 7.2 5.8c.3.2.7.2 1 0l7.2-5.8" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round" />
          <path d="M11.2 21.1v-8h2.4l4.8 5.1v-5.1h2.4v8h-2.4l-4.8-5.1v5.1h-2.4Z" fill="#0F766E" />
        </svg>
        <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-teal-400 ring-2 ring-white" />
      </span>
      {showText ? <span className="font-semibold tracking-normal">Mail Ninja</span> : null}
    </span>
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "good" | "warn" | "bad" }) {
  const tones = {
    neutral: "bg-white text-muted ring-line",
    good: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    warn: "bg-amber-50 text-amber-800 ring-amber-200",
    bad: "bg-red-50 text-red-800 ring-red-200"
  };
  return <span className={`status-badge ${tones[tone]}`}>{children}</span>;
}

export function ButtonLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link className="inline-flex items-center rounded bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-teal-800" href={href}>
      {children}
    </Link>
  );
}

export function PageHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <h1 className="text-2xl font-semibold tracking-normal">{title}</h1>
      {action}
    </div>
  );
}

export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded border border-line bg-white p-8 text-center">
      <h2 className="font-medium">{title}</h2>
      <p className="mt-1 text-sm text-muted">{detail}</p>
    </div>
  );
}
