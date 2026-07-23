export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function normalizeLocale(
  locale: string | null | undefined,
  fallback = "en",
) {
  if (!locale) return fallback;
  const cleaned = locale.trim().replace("_", "-");
  try {
    return Intl.getCanonicalLocales(cleaned)[0]?.toLowerCase() ?? fallback;
  } catch {
    return fallback;
  }
}

export function parseBoolean(input: unknown): boolean | null {
  if (typeof input === "boolean") return input;
  if (typeof input !== "string") return null;
  const value = input.trim().toLowerCase();
  if (["true", "1", "yes", "y", "on"].includes(value)) return true;
  if (["false", "0", "no", "n", "off"].includes(value)) return false;
  return null;
}

export function parseDate(input: unknown): Date | null {
  if (!input || typeof input !== "string") return null;
  const date = new Date(input);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function csvSafe(value: unknown) {
  const text = String(value ?? "");
  return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
}
