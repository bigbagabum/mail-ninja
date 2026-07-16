"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { auditLogs, suppressions } from "@/db/schema";
import { normalizeEmail } from "@/lib/normalization";
import { requireAdmin } from "@/server/auth/session";

const schema = z.object({ email: z.string().email(), reason: z.enum(["manual", "unsubscribe", "hard_bounce", "soft_bounce_limit", "complaint", "provider_suppressed", "invalid_email", "deleted_recipient", "other"]), notes: z.string().optional(), isPermanent: z.coerce.boolean().optional() });

export async function addSuppressionAction(formData: FormData) {
  const admin = await requireAdmin();
  const data = schema.parse(Object.fromEntries(formData));
  await db.transaction(async (tx) => {
    const [suppression] = await tx.insert(suppressions).values({ workspaceId: admin.workspaceId, email: data.email, normalizedEmail: normalizeEmail(data.email), reason: data.reason, source: "manual", notes: data.notes, isPermanent: Boolean(data.isPermanent) }).onConflictDoUpdate({
      target: [suppressions.workspaceId, suppressions.normalizedEmail],
      set: { reason: data.reason, notes: data.notes, isPermanent: Boolean(data.isPermanent), updatedAt: new Date() }
    }).returning();
    await tx.insert(auditLogs).values({ workspaceId: admin.workspaceId, adminUserId: admin.id, action: "suppression_addition", entityType: "suppression", entityId: suppression.id });
  });
  redirect("/suppressions");
}
