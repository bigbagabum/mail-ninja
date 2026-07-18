"use client";

import { useActionState } from "react";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { useLocale } from "@/components/locale-provider";
import { MailNinjaLogo } from "@/components/logo";
import { PasswordInput } from "@/components/password-input";
import { loginAction } from "./actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState(loginAction, undefined);
  const { t } = useLocale();
  return (
    <main className="flex min-h-screen items-center justify-center bg-panel px-4">
      <form action={action} className="w-full max-w-sm rounded border border-line bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-xl font-semibold">
            <MailNinjaLogo />
          </h1>
          <LocaleSwitcher />
        </div>
        <p className="mt-1 text-sm text-muted">{t("authSignInTitle")}</p>
        <label className="mt-6 block text-sm font-medium" htmlFor="email">
          {t("authEmail")}
        </label>
        <input id="email" name="email" type="email" required className="mt-1 w-full rounded border-line" />
        <label className="mt-4 block text-sm font-medium" htmlFor="password">
          {t("authPassword")}
        </label>
        <PasswordInput id="password" name="password" required autoComplete="current-password" />
        {state?.error ? <p className="mt-3 text-sm text-danger">{t(state.error)}</p> : null}
        <button disabled={pending} className="mt-6 w-full rounded bg-accent px-3 py-2 font-medium text-white disabled:opacity-60">
          {t("authSignIn")}
        </button>
      </form>
    </main>
  );
}
