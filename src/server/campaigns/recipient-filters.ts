import { and, eq, inArray, type SQL } from "drizzle-orm";
import { db } from "@/db";
import {
  recipientTagAssignments,
  recipientTags,
  recipients,
} from "@/db/schema";

export type CampaignRecipientFilters = {
  tagSlugs: string[];
  locale: string | null;
  platform: string | null;
  emailVerified: boolean | null;
  marketingConsent: boolean | null;
};

const defaultFilters: CampaignRecipientFilters = {
  tagSlugs: [],
  locale: null,
  platform: null,
  emailVerified: null,
  marketingConsent: null,
};

function cleanString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function cleanBoolean(value: unknown) {
  return typeof value === "boolean" ? value : null;
}

export function parseCampaignRecipientFilters(
  metadata: Record<string, unknown> | null | undefined,
): CampaignRecipientFilters {
  const raw =
    metadata &&
    typeof metadata.recipientFilters === "object" &&
    metadata.recipientFilters !== null
      ? (metadata.recipientFilters as Record<string, unknown>)
      : {};
  return {
    tagSlugs: Array.isArray(raw.tagSlugs)
      ? raw.tagSlugs.filter(
          (value): value is string =>
            typeof value === "string" && Boolean(value),
        )
      : [],
    locale: cleanString(raw.locale),
    platform: cleanString(raw.platform),
    emailVerified: cleanBoolean(raw.emailVerified),
    marketingConsent: cleanBoolean(raw.marketingConsent),
  };
}

export function buildCampaignRecipientFilters(input: {
  tagSlugs?: unknown[];
  locale?: unknown;
  platform?: unknown;
  emailVerified?: unknown;
  marketingConsent?: unknown;
}): CampaignRecipientFilters {
  return {
    tagSlugs:
      input.tagSlugs
        ?.filter((value): value is string => typeof value === "string")
        .filter(Boolean) ?? [],
    locale: cleanString(input.locale),
    platform: cleanString(input.platform),
    emailVerified: cleanBoolean(input.emailVerified),
    marketingConsent: cleanBoolean(input.marketingConsent),
  };
}

export async function loadFilteredRecipients(
  workspaceId: string,
  filters: CampaignRecipientFilters,
) {
  const conditions: SQL[] = [eq(recipients.workspaceId, workspaceId)];
  if (filters.locale) conditions.push(eq(recipients.locale, filters.locale));
  if (filters.platform)
    conditions.push(eq(recipients.platform, filters.platform));
  if (filters.emailVerified !== null) {
    conditions.push(eq(recipients.emailVerified, filters.emailVerified));
  }
  if (filters.marketingConsent !== null) {
    conditions.push(eq(recipients.marketingConsent, filters.marketingConsent));
  }
  if (filters.tagSlugs.length > 0) {
    const tagAssignments = await db
      .select({ recipientId: recipientTagAssignments.recipientId })
      .from(recipientTagAssignments)
      .innerJoin(
        recipientTags,
        eq(recipientTagAssignments.tagId, recipientTags.id),
      )
      .where(
        and(
          eq(recipientTagAssignments.workspaceId, workspaceId),
          inArray(recipientTags.slug, filters.tagSlugs),
        ),
      );
    const recipientIds = [
      ...new Set(tagAssignments.map((row) => row.recipientId)),
    ];
    if (recipientIds.length === 0) return [];
    conditions.push(inArray(recipients.id, recipientIds));
  }
  return db.query.recipients.findMany({
    where: and(...conditions),
    orderBy: (table, { asc, desc }) => [
      desc(table.priorityScore),
      asc(table.id),
    ],
  });
}

export const emptyCampaignRecipientFilters = defaultFilters;

export function describeCampaignRecipientFilters(
  filters: CampaignRecipientFilters,
) {
  const descriptions: string[] = [];
  if (filters.tagSlugs.length > 0) {
    descriptions.push(`Tags: ${filters.tagSlugs.join(", ")}`);
  }
  if (filters.locale) descriptions.push(`Locale: ${filters.locale}`);
  if (filters.platform) descriptions.push(`Platform: ${filters.platform}`);
  if (filters.emailVerified !== null) {
    descriptions.push(
      filters.emailVerified ? "Email verified" : "Email not verified",
    );
  }
  if (filters.marketingConsent !== null) {
    descriptions.push(
      filters.marketingConsent
        ? "Marketing consent required"
        : "No marketing consent",
    );
  }
  return descriptions;
}
