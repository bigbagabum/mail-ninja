"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, recipients } from "@/db/schema";
import { requireAdmin } from "@/server/auth/session";

const prioritySchema = z.object({
  recipientId: z.string().uuid(),
  priorityScore: z.coerce.number().int().min(0).max(100),
  priorityCohort: z.string().min(1),
  priorityNotes: z.string().optional()
});

export async function updateRecipientPriorityAction(formData: FormData) {
  const admin = await requireAdmin();
  const data = prioritySchema.parse(Object.fromEntries(formData));
  const recipient = await db.query.recipients.findFirst({
    where: and(eq(recipients.id, data.recipientId), eq(recipients.workspaceId, admin.workspaceId))
  });
  if (!recipient) throw new Error("Recipient not found.");

  await db.transaction(async (tx) => {
    await tx
      .update(recipients)
      .set({
        priorityScore: data.priorityScore,
        priorityCohort: data.priorityCohort,
        prioritySource: "manual",
        priorityNotes: data.priorityNotes || null,
        updatedAt: new Date()
      })
      .where(eq(recipients.id, recipient.id));
    await tx.insert(auditLogs).values({
      workspaceId: admin.workspaceId,
      adminUserId: admin.id,
      action: "recipient_priority_update",
      entityType: "recipient",
      entityId: recipient.id,
      metadata: { priorityScore: data.priorityScore, priorityCohort: data.priorityCohort }
    });
  });

  revalidatePath(`/recipients/${recipient.id}`);
}
