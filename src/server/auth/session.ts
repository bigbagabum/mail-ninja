import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { adminSessions, adminUsers, auditLogs } from "@/db/schema";
import { createToken, sha256 } from "@/lib/crypto";
import { env } from "@/lib/env";
import { normalizeEmail } from "@/lib/normalization";
import { verifyPassword } from "@/lib/passwords";

export const sessionCookieName = "campaign_mailer_session";

export async function login(email: string, password: string) {
  const normalizedEmail = normalizeEmail(email);
  const user = await db.query.adminUsers.findFirst({
    where: and(eq(adminUsers.normalizedEmail, normalizedEmail), eq(adminUsers.isActive, true))
  });
  const ok = user ? await verifyPassword(user.passwordHash, password) : false;
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0] ?? null;
  if (!user || !ok) {
    const workspace = await db.query.workspaces.findFirst();
    if (workspace) {
      await db.insert(auditLogs).values({
        workspaceId: workspace.id,
        action: "failed_login",
        entityType: "admin_user",
        metadata: { email: normalizedEmail },
        ipAddress: ip
      });
    }
    return { ok: false as const };
  }

  const token = createToken();
  const expiresAt = new Date(Date.now() + env.SESSION_TTL_HOURS * 60 * 60 * 1000);
  await db.insert(adminSessions).values({
    adminUserId: user.id,
    tokenHash: sha256(token),
    expiresAt,
    lastSeenAt: new Date(),
    ipAddress: ip,
    userAgent: (await headers()).get("user-agent")
  });
  await db.update(adminUsers).set({ lastLoginAt: new Date() }).where(eq(adminUsers.id, user.id));
  await db.insert(auditLogs).values({
    workspaceId: user.workspaceId,
    adminUserId: user.id,
    action: "login",
    entityType: "admin_user",
    entityId: user.id,
    ipAddress: ip
  });
  (await cookies()).set(sessionCookieName, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt
  });
  return { ok: true as const };
}

export async function logout() {
  const token = (await cookies()).get(sessionCookieName)?.value;
  if (token) await db.delete(adminSessions).where(eq(adminSessions.tokenHash, sha256(token)));
  (await cookies()).delete(sessionCookieName);
}

export async function currentAdmin() {
  const token = (await cookies()).get(sessionCookieName)?.value;
  if (!token) return null;
  const session = await db.query.adminSessions.findFirst({
    where: and(eq(adminSessions.tokenHash, sha256(token)), gt(adminSessions.expiresAt, new Date()))
  });
  if (!session) return null;
  const user = await db.query.adminUsers.findFirst({ where: eq(adminUsers.id, session.adminUserId) });
  if (!user || !user.isActive) return null;
  return user;
}

export async function requireAdmin() {
  const user = await currentAdmin();
  if (!user) redirect("/login");
  return user;
}
