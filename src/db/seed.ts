import { hash } from "@node-rs/argon2";
import { eq } from "drizzle-orm";
import { db, sql } from "@/db";
import { adminUsers, workspaceSettings, workspaces } from "@/db/schema";
import { env } from "@/lib/env";
import { normalizeEmail } from "@/lib/normalization";

const [workspace] = await db
  .insert(workspaces)
  .values({
    name: "Example Company",
    slug: "default",
    defaultLocale: "en",
    timezone: env.APP_TIMEZONE,
  })
  .onConflictDoNothing({ target: workspaces.slug })
  .returning();

const existingWorkspace =
  workspace ??
  (await db.query.workspaces.findFirst({
    where: eq(workspaces.slug, "default"),
  }));
if (!existingWorkspace) throw new Error("default workspace was not created");

await db
  .insert(workspaceSettings)
  .values({
    workspaceId: existingWorkspace.id,
    productName: env.APP_NAME,
    publicBaseUrl: env.APP_BASE_URL,
    defaultFromName: env.DEFAULT_FROM_NAME,
    defaultFromEmail: env.DEFAULT_FROM_EMAIL,
    defaultReplyTo: env.DEFAULT_REPLY_TO,
    timezone: env.APP_TIMEZONE,
  })
  .onConflictDoNothing({ target: workspaceSettings.workspaceId });

if (env.INITIAL_ADMIN_EMAIL && env.INITIAL_ADMIN_PASSWORD) {
  await db
    .insert(adminUsers)
    .values({
      workspaceId: existingWorkspace.id,
      email: env.INITIAL_ADMIN_EMAIL,
      normalizedEmail: normalizeEmail(env.INITIAL_ADMIN_EMAIL),
      passwordHash: await hash(env.INITIAL_ADMIN_PASSWORD, {
        memoryCost: 19456,
        timeCost: 2,
        parallelism: 1,
      }),
      displayName: env.INITIAL_ADMIN_NAME,
    })
    .onConflictDoNothing();
}

await sql.end();
