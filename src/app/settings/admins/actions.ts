"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { adminSessions, adminUsers, auditLogs } from "@/db/schema";
import { normalizeEmail } from "@/lib/normalization";
import { hashPassword, verifyPassword } from "@/lib/passwords";
import { requireAdmin } from "@/server/auth/session";

const passwordSchema = z.string().min(12, "Password must be at least 12 characters.");

const createAdminSchema = z.object({
  email: z.string().email(),
  displayName: z.string().min(1),
  password: passwordSchema
});

export async function createAdminAction(formData: FormData) {
  const current = await requireAdmin();
  const data = createAdminSchema.parse(Object.fromEntries(formData));
  const normalizedEmail = normalizeEmail(data.email);
  const [created] = await db
    .insert(adminUsers)
    .values({
      workspaceId: current.workspaceId,
      email: data.email,
      normalizedEmail,
      displayName: data.displayName,
      passwordHash: await hashPassword(data.password),
      isActive: true
    })
    .onConflictDoUpdate({
      target: [adminUsers.workspaceId, adminUsers.normalizedEmail],
      set: {
        email: data.email,
        displayName: data.displayName,
        passwordHash: await hashPassword(data.password),
        isActive: true,
        updatedAt: new Date()
      }
    })
    .returning();
  await db.insert(auditLogs).values({
    workspaceId: current.workspaceId,
    adminUserId: current.id,
    action: "admin_user_upsert",
    entityType: "admin_user",
    entityId: created.id,
    metadata: { email: normalizedEmail }
  });
  revalidatePath("/settings/admins");
}

const resetPasswordSchema = z.object({
  adminUserId: z.string().uuid(),
  password: passwordSchema
});

export async function resetAdminPasswordAction(formData: FormData) {
  const current = await requireAdmin();
  const data = resetPasswordSchema.parse(Object.fromEntries(formData));
  const target = await db.query.adminUsers.findFirst({
    where: and(eq(adminUsers.id, data.adminUserId), eq(adminUsers.workspaceId, current.workspaceId))
  });
  if (!target) throw new Error("Admin user not found.");
  await db.transaction(async (tx) => {
    await tx
      .update(adminUsers)
      .set({ passwordHash: await hashPassword(data.password), updatedAt: new Date() })
      .where(eq(adminUsers.id, target.id));
    await tx.delete(adminSessions).where(eq(adminSessions.adminUserId, target.id));
    await tx.insert(auditLogs).values({
      workspaceId: current.workspaceId,
      adminUserId: current.id,
      action: "admin_password_reset",
      entityType: "admin_user",
      entityId: target.id,
      metadata: { email: target.normalizedEmail }
    });
  });
  revalidatePath("/settings/admins");
}

const changeOwnPasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema
});

export async function changeOwnPasswordAction(formData: FormData) {
  const current = await requireAdmin();
  const data = changeOwnPasswordSchema.parse(Object.fromEntries(formData));
  const ok = await verifyPassword(current.passwordHash, data.currentPassword);
  if (!ok) throw new Error("Current password is incorrect.");
  await db.transaction(async (tx) => {
    await tx
      .update(adminUsers)
      .set({ passwordHash: await hashPassword(data.newPassword), updatedAt: new Date() })
      .where(eq(adminUsers.id, current.id));
    await tx.delete(adminSessions).where(eq(adminSessions.adminUserId, current.id));
    await tx.insert(auditLogs).values({
      workspaceId: current.workspaceId,
      adminUserId: current.id,
      action: "admin_own_password_change",
      entityType: "admin_user",
      entityId: current.id
    });
  });
  revalidatePath("/settings/admins");
}

const statusSchema = z.object({
  adminUserId: z.string().uuid(),
  isActive: z.enum(["true", "false"])
});

export async function setAdminStatusAction(formData: FormData) {
  const current = await requireAdmin();
  const data = statusSchema.parse(Object.fromEntries(formData));
  if (data.adminUserId === current.id && data.isActive === "false") {
    throw new Error("You cannot deactivate your own admin account.");
  }
  const target = await db.query.adminUsers.findFirst({
    where: and(eq(adminUsers.id, data.adminUserId), eq(adminUsers.workspaceId, current.workspaceId))
  });
  if (!target) throw new Error("Admin user not found.");
  await db.transaction(async (tx) => {
    await tx.update(adminUsers).set({ isActive: data.isActive === "true", updatedAt: new Date() }).where(eq(adminUsers.id, target.id));
    if (data.isActive === "false") await tx.delete(adminSessions).where(eq(adminSessions.adminUserId, target.id));
    await tx.insert(auditLogs).values({
      workspaceId: current.workspaceId,
      adminUserId: current.id,
      action: data.isActive === "true" ? "admin_user_reactivated" : "admin_user_deactivated",
      entityType: "admin_user",
      entityId: target.id,
      metadata: { email: target.normalizedEmail }
    });
  });
  revalidatePath("/settings/admins");
}
