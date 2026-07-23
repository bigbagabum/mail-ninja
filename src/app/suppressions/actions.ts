"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, suppressions } from "@/db/schema";
import { normalizeEmail } from "@/lib/normalization";
import { requireAdmin } from "@/server/auth/session";

const schema = z.object({
  email: z.string().email(),
  reason: z.enum([
    "manual",
    "unsubscribe",
    "hard_bounce",
    "soft_bounce_limit",
    "complaint",
    "provider_suppressed",
    "invalid_email",
    "deleted_recipient",
    "other",
  ]),
  notes: z.string().optional(),
  isPermanent: z.coerce.boolean().optional(),
});

export async function addSuppressionAction(formData: FormData) {
  const admin = await requireAdmin();
  const data = schema.parse(Object.fromEntries(formData));
  await db.transaction(async (tx) => {
    const [suppression] = await tx
      .insert(suppressions)
      .values({
        workspaceId: admin.workspaceId,
        email: data.email,
        normalizedEmail: normalizeEmail(data.email),
        reason: data.reason,
        source: "manual",
        notes: data.notes,
        isPermanent: Boolean(data.isPermanent),
      })
      .onConflictDoUpdate({
        target: [suppressions.workspaceId, suppressions.normalizedEmail],
        set: {
          reason: data.reason,
          notes: data.notes,
          isPermanent: Boolean(data.isPermanent),
          updatedAt: new Date(),
        },
      })
      .returning();
    await tx
      .insert(auditLogs)
      .values({
        workspaceId: admin.workspaceId,
        adminUserId: admin.id,
        action: "suppression_addition",
        entityType: "suppression",
        entityId: suppression.id,
      });
  });
  redirect("/suppressions");
}

const removeSchema = z.object({
  suppressionId: z.string().uuid(),
  confirmPermanentRemoval: z.coerce.boolean().optional(),
});

export async function removeSuppressionAction(formData: FormData) {
  const admin = await requireAdmin();
  const data = removeSchema.parse(Object.fromEntries(formData));
  const target = await db.query.suppressions.findFirst({
    where: and(
      eq(suppressions.id, data.suppressionId),
      eq(suppressions.workspaceId, admin.workspaceId),
    ),
  });
  if (!target) throw new Error("Suppression not found.");
  if (target.isPermanent && !data.confirmPermanentRemoval) {
    throw new Error(
      "Permanent suppression removal requires explicit confirmation.",
    );
  }

  await db.transaction(async (tx) => {
    await tx.delete(suppressions).where(eq(suppressions.id, target.id));
    await tx.insert(auditLogs).values({
      workspaceId: admin.workspaceId,
      adminUserId: admin.id,
      action: target.isPermanent
        ? "permanent_suppression_removal"
        : "suppression_removal",
      entityType: "suppression",
      entityId: target.id,
      metadata: { email: target.normalizedEmail, reason: target.reason },
    });
  });
  redirect("/suppressions");
}
