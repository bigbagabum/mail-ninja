export const TAG_COLORS = [
  "teal",
  "blue",
  "violet",
  "amber",
  "rose",
  "slate",
] as const;

export type TagColor = (typeof TAG_COLORS)[number];

export function slugifyTag(input: string) {
  const slug = input
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
  return slug || null;
}

export function parseTagList(input: unknown) {
  if (typeof input !== "string") return [];
  const seen = new Set<string>();
  return input
    .split(/[;,|]/)
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name) => ({ name, slug: slugifyTag(name) }))
    .filter((tag): tag is { name: string; slug: string } => Boolean(tag.slug))
    .filter((tag) => {
      if (seen.has(tag.slug)) return false;
      seen.add(tag.slug);
      return true;
    });
}

export function isTagColor(input: string): input is TagColor {
  return TAG_COLORS.includes(input as TagColor);
}

export function tagColorClasses(color: string) {
  const colors: Record<string, string> = {
    teal: "bg-teal-50 text-teal-800 ring-teal-200",
    blue: "bg-blue-50 text-blue-800 ring-blue-200",
    violet: "bg-violet-50 text-violet-800 ring-violet-200",
    amber: "bg-amber-50 text-amber-800 ring-amber-200",
    rose: "bg-rose-50 text-rose-800 ring-rose-200",
    slate: "bg-slate-50 text-slate-700 ring-slate-200",
  };
  return colors[color] ?? colors.teal;
}
