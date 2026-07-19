"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { campaigns, campaignVariants, emailTemplates } from "@/db/schema";
import { requireAdmin } from "@/server/auth/session";

const attachTemplateSchema = z.object({
  campaignId: z.string().uuid(),
  templateId: z.string().uuid(),
  isFallback: z.coerce.boolean().optional(),
});

export async function attachEmailTemplateToCampaignAction(formData: FormData) {
  const admin = await requireAdmin();
  const data = attachTemplateSchema.parse(Object.fromEntries(formData));

  const campaign = await db.query.campaigns.findFirst({
    where: eq(campaigns.id, data.campaignId),
  });
  if (!campaign || campaign.workspaceId !== admin.workspaceId) {
    throw new Error("Campaign not found.");
  }

  const template = await db.query.emailTemplates.findFirst({
    where: eq(emailTemplates.id, data.templateId),
  });
  if (!template || template.workspaceId !== admin.workspaceId) {
    throw new Error("Template not found.");
  }

  const [variant] = await db
    .insert(campaignVariants)
    .values({
      campaignId: campaign.id,
      locale: template.locale,
      recipientRole: template.recipientRole,
      name: template.name,
      subject: template.subject,
      previewText: template.previewText,
      htmlContent: template.htmlContent,
      textContent: template.textContent,
      isFallback: Boolean(data.isFallback),
    })
    .onConflictDoUpdate({
      target: [
        campaignVariants.campaignId,
        campaignVariants.locale,
        campaignVariants.recipientRole,
      ],
      set: {
        name: template.name,
        subject: template.subject,
        previewText: template.previewText,
        htmlContent: template.htmlContent,
        textContent: template.textContent,
        isFallback: Boolean(data.isFallback),
        updatedAt: new Date(),
      },
    })
    .returning({ id: campaignVariants.id });

  redirect(`/campaigns/${campaign.id}/variants?template=${variant.id}`);
}
