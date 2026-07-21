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
const emptyBlockBeforeTextDivDetector =
  /(?:<(h[1-6]|p)([^>]*)>\s*<\/\1>|<div>\s*<(h[1-6]|p)([^>]*)>\s*<\/\3>\s*<\/div>)\s*<div>\s*([^<>]*\S[^<>]*)\s*<\/div>/i;
const emptyBlockBeforeTextDiv =
  /<(h[1-6]|p)([^>]*)>\s*<\/\1>\s*<div>\s*([^<>]*\S[^<>]*)\s*<\/div>/gi;
const emptyWrappedBlockBeforeTextDiv =
  /<div>\s*<(h[1-6]|p)([^>]*)>\s*<\/\1>\s*<\/div>\s*<div>\s*([^<>]*\S[^<>]*)\s*<\/div>/gi;

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

function repairEditorMangledHtml(value: string) {
  let repaired = value;
  let previous = "";

  while (previous !== repaired) {
    previous = repaired;
    repaired = repaired
      .replace(emptyWrappedBlockBeforeTextDiv, "<$1$2>$3</$1>")
      .replace(emptyBlockBeforeTextDiv, "<$1$2>$3</$1>");
  }

  return repaired
    .replace(/<div>\s*(?:<br\s*\/?>)?\s*<\/div>/gi, "")
    .replace(/<div>\s*(<a\b[^>]*>[\s\S]*?<\/a>)\s*<\/div>/gi, "$1")
    .replace(/<a\b[^>]*>\s*<\/a>/gi, "")
    .replace(/<p\b[^>]*>\s*<\/p>/gi, "")
    .replace(/<h([1-6])\b[^>]*>\s*<\/h\1>/gi, "")
    .replace(/<div[^>]*>\s*/gi, "")
    .replace(/\s*<\/div>/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function normalizeTemplateHtml(value: string) {
  const trimmed = value.trim();
  const divCount = (trimmed.match(/<div\b/gi) ?? []).length;
  const hasEmptySemanticTag = /<(?:h[1-6]|p)\b[^>]*>\s*<\/(?:h[1-6]|p)>/i.test(
    trimmed,
  );
  const hasEditorMangledShape =
    divCount >= 4 &&
    hasEmptySemanticTag &&
    emptyBlockBeforeTextDivDetector.test(trimmed);
  const hasEscapedHtmlTag = /&lt;(?:!doctype|\/?[a-z][\w:-]*)(?:\s|&gt;)/i.test(
    trimmed,
  );

  if (hasEditorMangledShape) {
    return repairEditorMangledHtml(trimmed);
  }

  if (!hasEscapedHtmlTag) {
    return value;
  }

  const decoded = decodeBasicEntities(trimmed);
  const documentStart = decoded.search(/<!doctype|<html/i);
  const documentEnd = decoded.toLowerCase().lastIndexOf("</html>");

  if (documentStart >= 0 && documentEnd > documentStart) {
    return decoded.slice(documentStart, documentEnd + "</html>".length);
  }

  return decoded;
}

export function htmlToPlainText(html: string) {
  const normalizedHtml = normalizeTemplateHtml(html);
  return decodeBasicEntities(
    normalizedHtml
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
