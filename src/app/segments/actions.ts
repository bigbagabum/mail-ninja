"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  audienceSegmentMembers,
  audienceSegments,
  auditLogs,
  campaigns,
  campaignRecipients,
  recipients,
  recipientTags,
} from "@/db/schema";
import { requireAdmin } from "@/server/auth/session";
import { loadSegmentRecipients } from "@/server/campaigns/recipient-filters";

async function invalidateCampaignsForSegment(
  workspaceId: string,
  segmentId: string,
) {
  const rows = await db.query.campaigns.findMany({
    where: eq(campaigns.workspaceId, workspaceId),
  });
  for (const campaign of rows) {
    const filters =
      campaign.metadata?.recipientFilters &&
      typeof campaign.metadata.recipientFilters === "object"
        ? (campaign.metadata.recipientFilters as Record<string, unknown>)
        : {};
    if (filters.segmentId !== segmentId) continue;
    if (
      [
        "draft",
        "sending",
        "completed",
        "cancelled",
        "failed",
        "archived",
      ].includes(campaign.status)
    )
      continue;
    const alreadySent = await db.query.campaignRecipients.findFirst({
      where: and(
        eq(campaignRecipients.campaignId, campaign.id),
        sql`${campaignRecipients.sentAt} is not null`,
      ),
    });
    if (alreadySent) continue;
    await db
      .update(campaigns)
      .set({
        metadata: {
          ...campaign.metadata,
          preparationInvalidated: true,
          preparationInvalidatedAt: new Date().toISOString(),
        },
        updatedAt: new Date(),
      })
      .where(eq(campaigns.id, campaign.id));
  }
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 81);
}

const segmentSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  segmentType: z.enum(["manual", "dynamic"]),
  tagMatchMode: z.enum(["any", "all"]).default("any"),
});

export async function createSegmentAction(formData: FormData) {
  const admin = await requireAdmin();
  const data = segmentSchema.parse(Object.fromEntries(formData));
  const tagIds = z.array(z.string().uuid()).parse(formData.getAll("tagIds"));
  const tags = tagIds.length
    ? await db.query.recipientTags.findMany({
        where: and(
          eq(recipientTags.workspaceId, admin.workspaceId),
          inArray(recipientTags.id, tagIds),
        ),
      })
    : [];
  const slug = slugify(data.name);
  if (!slug) throw new Error("Segment name must contain a letter or number.");
  const [segment] = await db
    .insert(audienceSegments)
    .values({
      workspaceId: admin.workspaceId,
      name: data.name.trim(),
      slug,
      description: data.description?.trim() || null,
      segmentType: data.segmentType,
      tagMatchMode: data.tagMatchMode,
      rules:
        data.segmentType === "dynamic"
          ? { tagSlugs: tags.map((tag) => tag.slug) }
          : {},
      updatedBy: admin.id,
    })
    .onConflictDoUpdate({
      target: [audienceSegments.workspaceId, audienceSegments.slug],
      set: {
        name: data.name.trim(),
        description: data.description?.trim() || null,
        segmentType: data.segmentType,
        tagMatchMode: data.tagMatchMode,
        rules:
          data.segmentType === "dynamic"
            ? { tagSlugs: tags.map((tag) => tag.slug) }
            : {},
        updatedBy: admin.id,
        updatedAt: new Date(),
      },
    })
    .returning();
  await db.insert(auditLogs).values({
    workspaceId: admin.workspaceId,
    adminUserId: admin.id,
    action: "audience_segment_upsert",
    entityType: "audience_segment",
    entityId: segment.id,
    metadata: { segmentType: data.segmentType },
  });
  await invalidateCampaignsForSegment(admin.workspaceId, segment.id);
  redirect(`/segments/${segment.id}`);
}

export async function addSelectedRecipientsToSegmentAction(formData: FormData) {
  const admin = await requireAdmin();
  const segmentId = z.string().uuid().parse(formData.get("segmentId"));
  const recipientIds = z
    .array(z.string().uuid())
    .parse(formData.getAll("recipientIds"));
  if (recipientIds.length === 0) redirect(`/segments/${segmentId}`);
  const segment = await db.query.audienceSegments.findFirst({
    where: and(
      eq(audienceSegments.workspaceId, admin.workspaceId),
      eq(audienceSegments.id, segmentId),
    ),
  });
  if (!segment || segment.segmentType !== "manual")
    throw new Error("Manual segment not found.");
  const validRecipients = await db.query.recipients.findMany({
    where: and(
      eq(recipients.workspaceId, admin.workspaceId),
      inArray(recipients.id, recipientIds),
    ),
  });
  await db
    .insert(audienceSegmentMembers)
    .values(
      validRecipients.map((recipient) => ({
        workspaceId: admin.workspaceId,
        segmentId,
        recipientId: recipient.id,
        addedBy: admin.id,
      })),
    )
    .onConflictDoNothing();
  await invalidateCampaignsForSegment(admin.workspaceId, segmentId);
  redirect(`/segments/${segmentId}`);
}

export async function addFilteredRecipientsToSegmentAction(formData: FormData) {
  const admin = await requireAdmin();
  const segmentId = z.string().uuid().parse(formData.get("segmentId"));
  const sourceSegmentId = z
    .string()
    .uuid()
    .parse(formData.get("sourceSegmentId"));
  const segment = await db.query.audienceSegments.findFirst({
    where: and(
      eq(audienceSegments.workspaceId, admin.workspaceId),
      eq(audienceSegments.id, segmentId),
    ),
  });
  const sourceSegment = await db.query.audienceSegments.findFirst({
    where: and(
      eq(audienceSegments.workspaceId, admin.workspaceId),
      eq(audienceSegments.id, sourceSegmentId),
    ),
  });
  if (!segment || segment.segmentType !== "manual")
    throw new Error("Manual segment not found.");
  if (!sourceSegment) throw new Error("Source segment not found.");
  const rows = await loadSegmentRecipients(admin.workspaceId, sourceSegment);
  if (rows.length > 0) {
    await db
      .insert(audienceSegmentMembers)
      .values(
        rows.map((recipient) => ({
          workspaceId: admin.workspaceId,
          segmentId,
          recipientId: recipient.id,
          addedBy: admin.id,
        })),
      )
      .onConflictDoNothing();
  }
  await invalidateCampaignsForSegment(admin.workspaceId, segmentId);
  redirect(`/segments/${segmentId}`);
}

export async function removeRecipientFromSegmentAction(formData: FormData) {
  const admin = await requireAdmin();
  const segmentId = z.string().uuid().parse(formData.get("segmentId"));
  const recipientId = z.string().uuid().parse(formData.get("recipientId"));
  await db
    .delete(audienceSegmentMembers)
    .where(
      and(
        eq(audienceSegmentMembers.workspaceId, admin.workspaceId),
        eq(audienceSegmentMembers.segmentId, segmentId),
        eq(audienceSegmentMembers.recipientId, recipientId),
      ),
    );
  await invalidateCampaignsForSegment(admin.workspaceId, segmentId);
  redirect(`/segments/${segmentId}`);
}
