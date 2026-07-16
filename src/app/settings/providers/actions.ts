"use server";

import { revalidatePath } from "next/cache";
import { Resend } from "resend";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, providerAccounts } from "@/db/schema";
import { decryptSecret, encryptSecret, secretHint } from "@/lib/secret-box";
import { requireAdmin } from "@/server/auth/session";

const createProviderAccountSchema = z.object({
  provider: z.enum(["resend", "custom"]).default("resend"),
  name: z.string().min(1),
  apiKey: z.string().min(8),
  webhookSecret: z.string().optional(),
  routingOrder: z.coerce.number().int().min(0).default(100)
});

function providerErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message.slice(0, 500);
  if (typeof error === "string") return error.slice(0, 500);
  return "Provider check failed.";
}

async function validateProviderKey(provider: "resend" | "custom", apiKey: string) {
  try {
    if (provider !== "resend") {
      throw new Error("Automatic key validation is only implemented for Resend accounts.");
    }

    const resend = new Resend(apiKey);
    const result = await resend.domains.list({ limit: 1 });
    if (result.error) {
      throw new Error(result.error.message);
    }

    return { ok: true as const, error: null };
  } catch (error) {
    return { ok: false as const, error: providerErrorMessage(error) };
  }
}

export async function createProviderAccountAction(formData: FormData) {
  const admin = await requireAdmin();
  const data = createProviderAccountSchema.parse(Object.fromEntries(formData));
  const checkedAt = new Date();
  const validation = await validateProviderKey(data.provider, data.apiKey);
  const [account] = await db
    .insert(providerAccounts)
    .values({
      workspaceId: admin.workspaceId,
      provider: data.provider,
      name: data.name,
      apiKeyEncrypted: encryptSecret(data.apiKey),
      apiKeyHint: secretHint(data.apiKey),
      webhookSecretEncrypted: data.webhookSecret ? encryptSecret(data.webhookSecret) : null,
      status: validation.ok ? "active" : "failed",
      routingOrder: data.routingOrder,
      lastCheckedAt: checkedAt,
      lastError: validation.error,
      createdBy: admin.id
    })
    .onConflictDoUpdate({
      target: [providerAccounts.workspaceId, providerAccounts.provider, providerAccounts.name],
      set: {
        apiKeyEncrypted: encryptSecret(data.apiKey),
        apiKeyHint: secretHint(data.apiKey),
        webhookSecretEncrypted: data.webhookSecret ? encryptSecret(data.webhookSecret) : null,
        routingOrder: data.routingOrder,
        status: validation.ok ? "active" : "failed",
        lastCheckedAt: checkedAt,
        lastError: validation.error,
        updatedAt: checkedAt
      }
    })
    .returning();

  await db.insert(auditLogs).values({
    workspaceId: admin.workspaceId,
    adminUserId: admin.id,
    action: "provider_account_upsert",
    entityType: "provider_account",
    entityId: account.id,
    metadata: { provider: data.provider, name: data.name, validation: validation.ok ? "success" : "failed" }
  });
  revalidatePath("/settings/providers");
  revalidatePath("/settings");
}

const statusSchema = z.object({
  providerAccountId: z.string().uuid(),
  status: z.enum(["active", "paused"])
});

export async function setProviderAccountStatusAction(formData: FormData) {
  const admin = await requireAdmin();
  const data = statusSchema.parse(Object.fromEntries(formData));
  const target = await db.query.providerAccounts.findFirst({
    where: and(eq(providerAccounts.id, data.providerAccountId), eq(providerAccounts.workspaceId, admin.workspaceId))
  });
  if (!target) throw new Error("Provider account not found.");

  await db.transaction(async (tx) => {
    await tx.update(providerAccounts).set({ status: data.status, updatedAt: new Date() }).where(eq(providerAccounts.id, target.id));
    await tx.insert(auditLogs).values({
      workspaceId: admin.workspaceId,
      adminUserId: admin.id,
      action: data.status === "active" ? "provider_account_activated" : "provider_account_paused",
      entityType: "provider_account",
      entityId: target.id,
      metadata: { provider: target.provider, name: target.name }
    });
  });
  revalidatePath("/settings/providers");
  revalidatePath("/settings");
}

const deleteSchema = z.object({ providerAccountId: z.string().uuid() });

const testSchema = z.object({ providerAccountId: z.string().uuid() });

export async function testProviderAccountAction(formData: FormData) {
  const admin = await requireAdmin();
  const data = testSchema.parse(Object.fromEntries(formData));
  const target = await db.query.providerAccounts.findFirst({
    where: and(eq(providerAccounts.id, data.providerAccountId), eq(providerAccounts.workspaceId, admin.workspaceId))
  });
  if (!target) throw new Error("Provider account not found.");

  const checkedAt = new Date();
  const validation = await validateProviderKey(target.provider as "resend" | "custom", decryptSecret(target.apiKeyEncrypted));
  if (validation.ok) {
    await db.transaction(async (tx) => {
      await tx
        .update(providerAccounts)
        .set({
          status: target.status === "failed" ? "active" : target.status,
          lastCheckedAt: checkedAt,
          lastError: null,
          updatedAt: checkedAt
        })
        .where(eq(providerAccounts.id, target.id));
      await tx.insert(auditLogs).values({
        workspaceId: admin.workspaceId,
        adminUserId: admin.id,
        action: "provider_account_test_success",
        entityType: "provider_account",
        entityId: target.id,
        metadata: { provider: target.provider, name: target.name }
      });
    });
  } else {
    await db.transaction(async (tx) => {
      await tx
        .update(providerAccounts)
        .set({ status: "failed", lastCheckedAt: checkedAt, lastError: validation.error, updatedAt: checkedAt })
        .where(eq(providerAccounts.id, target.id));
      await tx.insert(auditLogs).values({
        workspaceId: admin.workspaceId,
        adminUserId: admin.id,
        action: "provider_account_test_failed",
        entityType: "provider_account",
        entityId: target.id,
        metadata: { provider: target.provider, name: target.name, error: validation.error }
      });
    });
  }

  revalidatePath("/settings/providers");
  revalidatePath("/settings");
}

export async function deleteProviderAccountAction(formData: FormData) {
  const admin = await requireAdmin();
  const data = deleteSchema.parse(Object.fromEntries(formData));
  const target = await db.query.providerAccounts.findFirst({
    where: and(eq(providerAccounts.id, data.providerAccountId), eq(providerAccounts.workspaceId, admin.workspaceId))
  });
  if (!target) throw new Error("Provider account not found.");
  await db.transaction(async (tx) => {
    await tx.delete(providerAccounts).where(eq(providerAccounts.id, target.id));
    await tx.insert(auditLogs).values({
      workspaceId: admin.workspaceId,
      adminUserId: admin.id,
      action: "provider_account_deleted",
      entityType: "provider_account",
      entityId: target.id,
      metadata: { provider: target.provider, name: target.name }
    });
  });
  revalidatePath("/settings/providers");
  revalidatePath("/settings");
}
