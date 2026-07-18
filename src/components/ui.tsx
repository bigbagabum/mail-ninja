import Link from "next/link";
import { Info } from "lucide-react";
import type { ReactNode } from "react";

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "good" | "warn" | "bad";
}) {
  const tones = {
    neutral: "bg-white text-muted ring-line",
    good: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    warn: "bg-amber-50 text-amber-800 ring-amber-200",
    bad: "bg-red-50 text-red-800 ring-red-200",
  };
  return <span className={`status-badge ${tones[tone]}`}>{children}</span>;
}

export function ButtonLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      className="inline-flex w-fit items-center rounded bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-teal-800"
      href={href}
    >
      {children}
    </Link>
  );
}

export function PageHeader({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h1 className="min-w-0 break-words text-xl font-semibold tracking-normal sm:text-2xl">
        {title}
      </h1>
      {action ? (
        <div className="flex shrink-0 flex-wrap gap-2">{action}</div>
      ) : null}
    </div>
  );
}

export function EmptyState({
  title,
  detail,
}: {
  title: string;
  detail: string;
}) {
  return (
    <div className="rounded border border-line bg-white p-8 text-center">
      <h2 className="font-medium">{title}</h2>
      <p className="mt-1 text-sm text-muted">{detail}</p>
    </div>
  );
}

export function InfoNote({ children }: { children: ReactNode }) {
  return (
    <div className="rounded border border-blue-100 bg-blue-50 p-4 text-sm text-blue-950">
      <div className="flex items-start gap-2">
        <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
        <div>{children}</div>
      </div>
    </div>
  );
}
