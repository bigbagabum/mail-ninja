"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import {
  campaignRecipients,
  campaigns,
  campaignVariants,
  emailTemplates,
} from "@/db/schema";
import { htmlToPlainText, normalizeTemplateHtml } from "@/lib/templates";
import { requireAdmin } from "@/server/auth/session";

const attachTemplateSchema = z.object({
  campaignId: z.string().uuid(),
  templateId: z.string().uuid(),
});

const detachTemplateSchema = z.object({
  campaignId: z.string().uuid(),
  variantId: z.string().uuid(),
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
  if (
    !template ||
    template.workspaceId !== admin.workspaceId ||
    template.deletedAt
  ) {
    throw new Error("Template not found.");
  }
  const htmlContent = normalizeTemplateHtml(template.htmlContent);
  const textContent = template.textContent || htmlToPlainText(htmlContent);

  const [variant] = await db
    .insert(campaignVariants)
    .values({
      campaignId: campaign.id,
      locale: template.locale,
      recipientRole: template.recipientRole,
      name: template.name,
      subject: template.subject,
      previewText: template.previewText,
      htmlContent,
      textContent,
      isFallback: false,
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
        htmlContent,
        textContent,
        isFallback: false,
        updatedAt: new Date(),
      },
    })
    .returning({ id: campaignVariants.id });

  redirect(`/campaigns/${campaign.id}/variants?template=${variant.id}`);
}

export async function detachCampaignTemplateAction(formData: FormData) {
  const admin = await requireAdmin();
  const data = detachTemplateSchema.parse(Object.fromEntries(formData));

  const campaign = await db.query.campaigns.findFirst({
    where: eq(campaigns.id, data.campaignId),
  });
  if (!campaign || campaign.workspaceId !== admin.workspaceId) {
    throw new Error("Campaign not found.");
  }

  const variant = await db.query.campaignVariants.findFirst({
    where: eq(campaignVariants.id, data.variantId),
  });
  if (!variant || variant.campaignId !== campaign.id) {
    throw new Error("Campaign template not found.");
  }

  const usedRecipient = await db.query.campaignRecipients.findFirst({
    where: eq(campaignRecipients.variantId, data.variantId),
  });
  if (usedRecipient) {
    throw new Error(
      "This campaign template is already used by prepared recipients. Rebuild the campaign before detaching it.",
    );
  }

  await db
    .delete(campaignVariants)
    .where(eq(campaignVariants.id, data.variantId));
  redirect(`/campaigns/${campaign.id}/variants`);
}
