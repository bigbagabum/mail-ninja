"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import type { TranslationKey } from "@/lib/i18n";
import { login, logout } from "@/server/auth/session";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export async function loginAction(_: { error?: TranslationKey } | undefined, formData: FormData) {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "authInvalidCredentials" as const };
  const result = await login(parsed.data.email, parsed.data.password);
  if (!result.ok) return { error: "authInvalidCredentials" as const };
  redirect("/dashboard");
}

export async function logoutAction() {
  await logout();
  redirect("/login");
}
