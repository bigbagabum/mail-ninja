"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  auditLogs,
  recipients,
  recipientTagAssignments,
  recipientTags,
} from "@/db/schema";
import { normalizeEmail, normalizeLocale } from "@/lib/normalization";
import { requireAdmin } from "@/server/auth/session";

const addRecipientSchema = z.object({
  email: z.string().email(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  locale: z.string().optional(),
  platform: z.string().optional(),
  marketingConsent: z.coerce.boolean().optional(),
});

function clean(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function addRecipientAction(formData: FormData) {
  const admin = await requireAdmin();
  const data = addRecipientSchema.parse(Object.fromEntries(formData));
  const tagIds = z.array(z.string().uuid()).parse(formData.getAll("tagIds"));
  const normalizedEmail = normalizeEmail(data.email);
  await db.transaction(async (tx) => {
    const selectedTags = tagIds.length
      ? await tx.query.recipientTags.findMany({
          where: and(
            eq(recipientTags.workspaceId, admin.workspaceId),
            inArray(recipientTags.id, tagIds),
          ),
        })
      : [];
    const primaryTag = selectedTags[0] ?? null;
    const [recipient] = await tx
      .insert(recipients)
      .values({
        workspaceId: admin.workspaceId,
        email: data.email.trim(),
        normalizedEmail,
        firstName: clean(data.firstName),
        lastName: clean(data.lastName),
        locale: clean(data.locale) ? normalizeLocale(data.locale) : null,
        role: primaryTag?.slug ?? null,
        platform: clean(data.platform),
        marketingConsent: Boolean(data.marketingConsent),
        prioritySource: "manual",
      })
      .onConflictDoUpdate({
        target: [recipients.workspaceId, recipients.normalizedEmail],
        set: {
          email: data.email.trim(),
          firstName: clean(data.firstName) ?? sql`${recipients.firstName}`,
          lastName: clean(data.lastName) ?? sql`${recipients.lastName}`,
          locale: clean(data.locale)
            ? normalizeLocale(data.locale)
            : sql`${recipients.locale}`,
          role: primaryTag?.slug ?? sql`${recipients.role}`,
          platform: clean(data.platform) ?? sql`${recipients.platform}`,
          marketingConsent: Boolean(data.marketingConsent),
          prioritySource: "manual",
          updatedAt: new Date(),
        },
      })
      .returning();
    if (selectedTags.length > 0) {
      await tx
        .insert(recipientTagAssignments)
        .values(
          selectedTags.map((tag) => ({
            workspaceId: admin.workspaceId,
            recipientId: recipient.id,
            tagId: tag.id,
            createdBy: admin.id,
          })),
        )
        .onConflictDoNothing();
    }
    await tx.insert(auditLogs).values({
      workspaceId: admin.workspaceId,
      adminUserId: admin.id,
      action: "recipient_manual_upsert",
      entityType: "recipient",
      entityId: recipient.id,
      metadata: {
        email: normalizedEmail,
        tags: selectedTags.map((tag) => tag.slug),
      },
    });
  });
  redirect("/recipients");
}
