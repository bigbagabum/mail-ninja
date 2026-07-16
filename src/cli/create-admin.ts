import { db, sql } from "@/db";
import { adminUsers } from "@/db/schema";
import { env } from "@/lib/env";
import { normalizeEmail } from "@/lib/normalization";
import { hashPassword } from "@/lib/passwords";

const workspace = await db.query.workspaces.findFirst();
if (!workspace) throw new Error("Run db:seed first to create the default workspace.");
if (!env.INITIAL_ADMIN_EMAIL || !env.INITIAL_ADMIN_PASSWORD) {
  throw new Error("INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD are required.");
}

await db
  .insert(adminUsers)
  .values({
    workspaceId: workspace.id,
    email: env.INITIAL_ADMIN_EMAIL,
    normalizedEmail: normalizeEmail(env.INITIAL_ADMIN_EMAIL),
    passwordHash: await hashPassword(env.INITIAL_ADMIN_PASSWORD),
    displayName: env.INITIAL_ADMIN_NAME
  })
  .onConflictDoNothing();

await sql.end();
