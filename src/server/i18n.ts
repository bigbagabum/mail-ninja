import { cookies } from "next/headers";
import { localeCookieName, normalizeAppLocale } from "@/lib/i18n";

export async function currentLocale() {
  return normalizeAppLocale((await cookies()).get(localeCookieName)?.value);
}
