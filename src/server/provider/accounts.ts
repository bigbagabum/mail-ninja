import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { providerAccounts, workspaceSettings } from "@/db/schema";
import { env } from "@/lib/env";
import { decryptSecret } from "@/lib/secret-box";

export type ProviderRoutingStrategy = "sequential" | "parallel";

export type SelectedProviderAccount = {
  id: string | null;
  provider: "resend";
  name: string;
  apiKey: string;
  webhookSecret: string | null;
  source: "database" | "environment";
};

export async function getProviderRoutingStrategy(
  workspaceId: string,
): Promise<ProviderRoutingStrategy> {
  const settings = await db.query.workspaceSettings.findFirst({
    where: eq(workspaceSettings.workspaceId, workspaceId),
  });
  return settings?.providerRoutingStrategy ?? "sequential";
}

export async function selectProviderAccount(
  workspaceId: string,
  provider: "resend" = "resend",
  strategy?: ProviderRoutingStrategy,
): Promise<SelectedProviderAccount> {
  const active = await db.query.providerAccounts.findMany({
    where: and(
      eq(providerAccounts.workspaceId, workspaceId),
      eq(providerAccounts.provider, provider),
      eq(providerAccounts.status, "active"),
    ),
    orderBy: [
      asc(providerAccounts.routingOrder),
      asc(providerAccounts.usageCount),
      asc(providerAccounts.createdAt),
    ],
  });

  if (active.length === 0) {
    if (!env.RESEND_API_KEY)
      throw new Error("No active Resend provider account is configured.");
    return {
      id: null,
      provider,
      name: "Environment Resend key",
      apiKey: env.RESEND_API_KEY,
      webhookSecret: env.RESEND_WEBHOOK_SECRET ?? null,
      source: "environment",
    };
  }

  const routingStrategy =
    strategy ?? (await getProviderRoutingStrategy(workspaceId));
  const selected =
    routingStrategy === "parallel"
      ? active[Math.floor(Math.random() * active.length)]
      : active[0];
  return {
    id: selected.id,
    provider,
    name: selected.name,
    apiKey: decryptSecret(selected.apiKeyEncrypted),
    webhookSecret: selected.webhookSecretEncrypted
      ? decryptSecret(selected.webhookSecretEncrypted)
      : null,
    source: "database",
  };
}

export async function markProviderAccountUsed(
  providerAccountId: string | null,
) {
  if (!providerAccountId) return;
  await db
    .update(providerAccounts)
    .set({
      usageCount: sql`${providerAccounts.usageCount} + 1`,
      lastUsedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(providerAccounts.id, providerAccountId));
}

export async function listWebhookSecrets(workspaceId: string) {
  const rows = await db.query.providerAccounts.findMany({
    where: and(
      eq(providerAccounts.workspaceId, workspaceId),
      eq(providerAccounts.provider, "resend"),
      eq(providerAccounts.status, "active"),
    ),
  });
  const secrets: Array<{
    providerAccountId: string | null;
    secret: string;
    name: string;
  }> = rows
    .filter((row) => Boolean(row.webhookSecretEncrypted))
    .map((row) => ({
      providerAccountId: row.id,
      secret: decryptSecret(row.webhookSecretEncrypted as string),
      name: row.name,
    }));
  if (env.RESEND_WEBHOOK_SECRET)
    secrets.push({
      providerAccountId: null,
      secret: env.RESEND_WEBHOOK_SECRET,
      name: "Environment webhook secret",
    });
  return secrets;
}
