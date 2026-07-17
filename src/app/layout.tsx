import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import { logoutAction } from "./login/actions";
import { AppNav } from "@/components/app-nav";
import { MailNinjaLogo } from "@/components/logo";
import { currentAdmin } from "@/server/auth/session";
import { env, isSendingEnabled } from "@/lib/env";

export const metadata: Metadata = {
  title: "Mail Ninja",
  description: "Standalone email campaign management"
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const admin = await currentAdmin();
  return (
    <html lang="en">
      <body>
        {admin ? (
          <div className="min-h-screen">
            <header className="border-b border-line bg-white">
              <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
                <Link href="/dashboard" className="text-ink hover:text-accent" aria-label={`${env.APP_NAME} dashboard`}>
                  <MailNinjaLogo />
                </Link>
                <form action={logoutAction}>
                  <button className="text-sm text-muted hover:text-ink" type="submit">
                    Sign out
                  </button>
                </form>
              </div>
              {!isSendingEnabled ? (
                <div className="border-t border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-900">
                  Sending is disabled until provider credentials and sender settings are configured.
                </div>
              ) : null}
            </header>
            <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 md:grid-cols-[220px_1fr]">
              <AppNav />
              <main>{children}</main>
            </div>
          </div>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
