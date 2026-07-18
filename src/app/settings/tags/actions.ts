"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, recipientTags } from "@/db/schema";
import { isTagColor, slugifyTag, TAG_COLORS } from "@/lib/tags";
import { requireAdmin } from "@/server/auth/session";

const createTagSchema = z.object({
  name: z.string().trim().min(1).max(80),
  color: z.string().default("teal"),
  description: z.string().trim().max(240).optional(),
});

const deleteTagSchema = z.object({
  tagId: z.string().uuid(),
});

function clean(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function createRecipientTagAction(formData: FormData) {
  const admin = await requireAdmin();
  const data = createTagSchema.parse(Object.fromEntries(formData));
  const slug = slugifyTag(data.name);
  if (!slug) {
    throw new Error(
      "Tag name must contain at least one latin letter or number.",
    );
  }
  const color = isTagColor(data.color) ? data.color : TAG_COLORS[0];
  await db.transaction(async (tx) => {
    const [tag] = await tx
      .insert(recipientTags)
      .values({
        workspaceId: admin.workspaceId,
        name: data.name,
        slug,
        color,
        description: clean(data.description),
        createdBy: admin.id,
      })
      .onConflictDoUpdate({
        target: [recipientTags.workspaceId, recipientTags.slug],
        set: {
          name: data.name,
          color,
          description: clean(data.description),
          updatedAt: new Date(),
        },
      })
      .returning();
    await tx.insert(auditLogs).values({
      workspaceId: admin.workspaceId,
      adminUserId: admin.id,
      action: "recipient_tag_upsert",
      entityType: "recipient_tag",
      entityId: tag.id,
      metadata: { slug },
    });
  });
  revalidatePath("/settings/tags");
  revalidatePath("/recipients");
}

export async function deleteRecipientTagAction(formData: FormData) {
  const admin = await requireAdmin();
  const data = deleteTagSchema.parse(Object.fromEntries(formData));
  const [tag] = await db
    .delete(recipientTags)
    .where(
      and(
        eq(recipientTags.id, data.tagId),
        eq(recipientTags.workspaceId, admin.workspaceId),
      ),
    )
    .returning();
  if (tag) {
    await db.insert(auditLogs).values({
      workspaceId: admin.workspaceId,
      adminUserId: admin.id,
      action: "recipient_tag_delete",
      entityType: "recipient_tag",
      entityId: tag.id,
      metadata: { slug: tag.slug },
    });
  }
  revalidatePath("/settings/tags");
  revalidatePath("/recipients");
}
