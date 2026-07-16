const allowedVariables = new Set([
  "first_name",
  "last_name",
  "email",
  "locale",
  "role",
  "platform",
  "external_id",
  "campaign_name",
  "unsubscribe_url"
]);

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function renderTemplate(template: string, variables: Record<string, unknown>) {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => {
    if (!allowedVariables.has(key)) return "";
    return escapeHtml(String(variables[key] ?? ""));
  });
}

export function hasUnsubscribeLink(html: string, text?: string | null) {
  return html.includes("{{unsubscribe_url}}") || Boolean(text?.includes("{{unsubscribe_url}}"));
}
