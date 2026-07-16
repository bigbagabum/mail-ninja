import Link from "next/link";
import type { ReactNode } from "react";

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
