const secretParams = new Set(["token", "secret", "signature", "key", "password"]);

export function normalizeClickedUrl(input: string) {
  try {
    const url = new URL(input);
    for (const param of [...url.searchParams.keys()]) {
      if (secretParams.has(param.toLowerCase())) url.searchParams.set(param, "[redacted]");
    }
    url.hash = "";
    return url.toString();
  } catch {
    return input;
  }
}

export function classifyLink(input: string) {
  const url = input.toLowerCase();
  if (url.includes("unsubscribe")) return "unsubscribe";
  if (url.includes("apps.apple.com")) return "app_store";
  if (url.includes("play.google.com")) return "google_play";
  if (url.includes("password") || url.includes("reset")) return "password_reset";
  if (url.includes("support") || url.includes("help")) return "support";
  if (url.startsWith("http")) return "web_app";
  return "other";
}
