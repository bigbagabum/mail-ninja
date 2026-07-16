import { eq } from "drizzle-orm";
import { db, sql } from "@/db";
import { adminSessions, adminUsers, auditLogs } from "@/db/schema";
import { env } from "@/lib/env";
import { normalizeEmail } from "@/lib/normalization";
import { hashPassword } from "@/lib/passwords";

if (!env.INITIAL_ADMIN_EMAIL || !env.INITIAL_ADMIN_PASSWORD) {
  throw new Error("INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD are required.");
}

const initialAdminEmail = env.INITIAL_ADMIN_EMAIL;
const initialAdminPassword = env.INITIAL_ADMIN_PASSWORD;
const normalizedEmail = normalizeEmail(initialAdminEmail);
const admin = await db.query.adminUsers.findFirst({ where: eq(adminUsers.normalizedEmail, normalizedEmail) });
if (!admin) {
  throw new Error(`Admin user ${normalizedEmail} was not found.`);
}

await db.transaction(async (tx) => {
  await tx
    .update(adminUsers)
    .set({ passwordHash: await hashPassword(initialAdminPassword), isActive: true, updatedAt: new Date() })
    .where(eq(adminUsers.id, admin.id));
  await tx.delete(adminSessions).where(eq(adminSessions.adminUserId, admin.id));
  await tx.insert(auditLogs).values({
    workspaceId: admin.workspaceId,
    adminUserId: admin.id,
    action: "admin_password_reset_cli",
    entityType: "admin_user",
    entityId: admin.id,
    metadata: { email: normalizedEmail }
  });
});

await sql.end();
