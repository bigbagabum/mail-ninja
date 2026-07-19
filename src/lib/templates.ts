const allowedVariables = new Set([
  "first_name",
  "last_name",
  "email",
  "locale",
  "role",
  "platform",
  "external_id",
  "campaign_name",
  "unsubscribe_url",
]);

const blockBreakTags = /<\/(p|div|h[1-6]|li|tr|blockquote)>/gi;
const lineBreakTags = /<br\s*\/?>/gi;
const htmlTags = /<[^>]+>/g;

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function decodeBasicEntities(value: string) {
  return value
    .replaceAll("&nbsp;", " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#039;", "'");
}

export function htmlToPlainText(html: string) {
  return decodeBasicEntities(
    html
      .replace(lineBreakTags, "\n")
      .replace(blockBreakTags, "\n")
      .replace(htmlTags, "")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]{2,}/g, " ")
      .trim(),
  );
}

export function renderTemplate(
  template: string,
  variables: Record<string, unknown>,
) {
  return template.replace(
    /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g,
    (_, key: string) => {
      if (!allowedVariables.has(key)) return "";
      return escapeHtml(String(variables[key] ?? ""));
    },
  );
}

export function hasUnsubscribeLink(html: string, text?: string | null) {
  return (
    html.includes("{{unsubscribe_url}}") ||
    Boolean(text?.includes("{{unsubscribe_url}}"))
  );
}
