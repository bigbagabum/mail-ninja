import { and, eq, inArray, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import {
  audienceSegmentMembers,
  audienceSegments,
  recipientTagAssignments,
  recipientTags,
  recipients,
} from "@/db/schema";

export type CampaignRecipientFilters = {
  segmentId: string | null;
  manualRecipientIds: string[];
  tagSlugs: string[];
  locale: string | null;
  platform: string | null;
  emailVerified: boolean | null;
  marketingConsent: boolean | null;
};

const defaultFilters: CampaignRecipientFilters = {
  segmentId: null,
  manualRecipientIds: [],
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
    segmentId: cleanString(raw.segmentId),
    manualRecipientIds: Array.isArray(raw.manualRecipientIds)
      ? raw.manualRecipientIds.filter(
          (value): value is string =>
            typeof value === "string" && Boolean(value),
        )
      : [],
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
  segmentId?: unknown;
  manualRecipientIds?: unknown[];
  tagSlugs?: unknown[];
  locale?: unknown;
  platform?: unknown;
  emailVerified?: unknown;
  marketingConsent?: unknown;
}): CampaignRecipientFilters {
  return {
    segmentId: cleanString(input.segmentId),
    manualRecipientIds:
      input.manualRecipientIds
        ?.filter((value): value is string => typeof value === "string")
        .filter(Boolean) ?? [],
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
  if (filters.segmentId) {
    const segment = await db.query.audienceSegments.findFirst({
      where: and(
        eq(audienceSegments.workspaceId, workspaceId),
        eq(audienceSegments.id, filters.segmentId),
      ),
    });
    if (!segment) return [];
    return loadSegmentRecipients(workspaceId, segment);
  }
  if (filters.manualRecipientIds.length > 0) {
    return db.query.recipients.findMany({
      where: and(
        eq(recipients.workspaceId, workspaceId),
        inArray(recipients.id, filters.manualRecipientIds),
      ),
      orderBy: (table, { asc, desc }) => [
        desc(table.priorityScore),
        asc(table.id),
      ],
    });
  }
  return loadRuleRecipients(workspaceId, filters);
}

export async function loadSegmentRecipients(
  workspaceId: string,
  segment: typeof audienceSegments.$inferSelect,
) {
  if (segment.segmentType === "manual") {
    const memberships = await db
      .select({ recipientId: audienceSegmentMembers.recipientId })
      .from(audienceSegmentMembers)
      .where(
        and(
          eq(audienceSegmentMembers.workspaceId, workspaceId),
          eq(audienceSegmentMembers.segmentId, segment.id),
        ),
      );
    if (memberships.length === 0) return [];
    return db.query.recipients.findMany({
      where: and(
        eq(recipients.workspaceId, workspaceId),
        inArray(
          recipients.id,
          memberships.map((row) => row.recipientId),
        ),
      ),
      orderBy: (table, { asc, desc }) => [
        desc(table.priorityScore),
        asc(table.id),
      ],
    });
  }
  const rules = parseSegmentRules(segment.rules);
  return loadRuleRecipients(
    workspaceId,
    {
      segmentId: null,
      manualRecipientIds: [],
      tagSlugs: rules.tagSlugs,
      locale: null,
      platform: null,
      emailVerified: null,
      marketingConsent: null,
    },
    segment.tagMatchMode,
  );
}

export function parseSegmentRules(
  rules: Record<string, unknown> | null | undefined,
) {
  return {
    tagSlugs: Array.isArray(rules?.tagSlugs)
      ? rules.tagSlugs.filter(
          (value): value is string =>
            typeof value === "string" && Boolean(value),
        )
      : [],
  };
}

export async function loadRuleRecipients(
  workspaceId: string,
  filters: CampaignRecipientFilters,
  tagMatchMode: "any" | "all" = "any",
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
    const tagRows = await db.query.recipientTags.findMany({
      where: and(
        eq(recipientTags.workspaceId, workspaceId),
        inArray(recipientTags.slug, filters.tagSlugs),
      ),
    });
    if (tagRows.length === 0) return [];
    const tagAssignments = await db
      .select({
        recipientId: recipientTagAssignments.recipientId,
        tagCount: sql<number>`count(distinct ${recipientTagAssignments.tagId})::int`,
      })
      .from(recipientTagAssignments)
      .where(
        and(
          eq(recipientTagAssignments.workspaceId, workspaceId),
          inArray(
            recipientTagAssignments.tagId,
            tagRows.map((tag) => tag.id),
          ),
        ),
      )
      .groupBy(recipientTagAssignments.recipientId);
    const recipientIds = [
      ...new Set(
        tagAssignments
          .filter(
            (row) => tagMatchMode === "any" || row.tagCount === tagRows.length,
          )
          .map((row) => row.recipientId),
      ),
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
  if (filters.manualRecipientIds.length > 0) {
    descriptions.push(
      `Manual recipients: ${filters.manualRecipientIds.length}`,
    );
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
