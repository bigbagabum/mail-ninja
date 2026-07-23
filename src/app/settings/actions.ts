"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, workspaceSettings } from "@/db/schema";
import { requireAdmin } from "@/server/auth/session";

const settingsSchema = z.object({
  productName: z.string().min(1),
  publicBaseUrl: z.string().url().or(z.literal("")),
  defaultFromName: z.string().min(1),
  defaultFromEmail: z.string().email().or(z.literal("")),
  defaultReplyTo: z.string().email().or(z.literal("")),
  defaultLocale: z.string().min(2),
  timezone: z.string().min(1),
  providerRoutingStrategy: z.enum(["sequential", "parallel"]),
  providerMetricsMode: z.enum(["combined", "by_provider_account"]),
});

export async function updateSettingsAction(formData: FormData) {
  const admin = await requireAdmin();
  const data = settingsSchema.parse(Object.fromEntries(formData));
  const values = {
    productName: data.productName,
    publicBaseUrl: data.publicBaseUrl || null,
    defaultFromName: data.defaultFromName,
    defaultFromEmail: data.defaultFromEmail || null,
    defaultReplyTo: data.defaultReplyTo || null,
    defaultLocale: data.defaultLocale,
    timezone: data.timezone,
    provider: "resend",
    providerRoutingStrategy: data.providerRoutingStrategy,
    providerMetricsMode: data.providerMetricsMode,
    updatedAt: new Date(),
  };

  await db.transaction(async (tx) => {
    await tx
      .insert(workspaceSettings)
      .values({ workspaceId: admin.workspaceId, ...values })
      .onConflictDoUpdate({
        target: workspaceSettings.workspaceId,
        set: values,
      });
    await tx.insert(auditLogs).values({
      workspaceId: admin.workspaceId,
      adminUserId: admin.id,
      action: "settings_update",
      entityType: "workspace_settings",
      entityId: admin.workspaceId,
      metadata: { provider: "resend" },
    });
  });

  revalidatePath("/settings");
  revalidatePath("/settings/providers");
}

export async function getWorkspaceSettings(workspaceId: string) {
  return db.query.workspaceSettings.findFirst({
    where: eq(workspaceSettings.workspaceId, workspaceId),
  });
}
