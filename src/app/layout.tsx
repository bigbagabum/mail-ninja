import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { logoutAction } from "./login/actions";
import { AppNav } from "@/components/app-nav";
import { MailNinjaLogo } from "@/components/logo";
import { db } from "@/db";
import { providerAccounts, workspaceSettings } from "@/db/schema";
import { currentAdmin } from "@/server/auth/session";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  title: "Mail Ninja",
  description: "Standalone email campaign management"
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const admin = await currentAdmin();
  const sendingReady = admin ? await getSendingReady(admin.workspaceId) : false;
  return (
    <html lang="en">
      <body>
        {admin ? (
          <div className="min-h-screen">
            <header className="sticky top-0 z-40 border-b border-white/60 bg-white/55 backdrop-blur-2xl">
              <div className="mx-auto grid max-w-7xl grid-cols-[1fr_auto] items-center gap-3 px-3 py-3 sm:px-4 lg:grid-cols-[auto_minmax(0,1fr)_auto]">
                <Link href="/dashboard" className="text-ink hover:text-accent" aria-label={`${env.APP_NAME} dashboard`}>
                  <MailNinjaLogo />
                </Link>
                <div className="order-3 col-span-2 min-w-0 lg:order-none lg:col-span-1 lg:justify-self-center">
                  <AppNav />
                </div>
                <form action={logoutAction}>
                  <button className="text-sm text-muted hover:text-ink" type="submit">
                    Sign out
                  </button>
                </form>
              </div>
              {!sendingReady ? (
                <div className="border-t border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-900">
                  Sending is disabled until provider credentials and sender settings are configured.
                </div>
              ) : null}
            </header>
            <div className="mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-6">
              <main className="min-w-0">{children}</main>
            </div>
          </div>
        ) : (
          children
        )}
      </body>
    </html>
  );
}

async function getSendingReady(workspaceId: string) {
  const [settings, activeProviderAccount] = await Promise.all([
    db.query.workspaceSettings.findFirst({ where: eq(workspaceSettings.workspaceId, workspaceId) }),
    db.query.providerAccounts.findFirst({
      where: and(eq(providerAccounts.workspaceId, workspaceId), eq(providerAccounts.provider, "resend"), eq(providerAccounts.status, "active"))
    })
  ]);
  const hasProviderKey = Boolean(activeProviderAccount || env.RESEND_API_KEY);
  const hasSender = Boolean(settings?.defaultFromEmail || env.DEFAULT_FROM_EMAIL);
  return hasProviderKey && hasSender;
}
