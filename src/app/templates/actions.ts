"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { emailTemplates } from "@/db/schema";
import { requireAdmin } from "@/server/auth/session";
import { htmlToPlainText } from "@/lib/templates";

function slugifyTemplateSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
}

const templateSchema = z
  .object({
    templateId: z.string().uuid().optional(),
    name: z.string().min(1),
    slug: z.string().optional(),
    description: z.string().optional(),
    locale: z.string().min(2),
    recipientRole: z.string().default("generic"),
    subject: z.string().min(1),
    previewText: z.string().optional(),
    htmlContent: z.string().min(1),
    textContent: z.string().optional(),
  })
  .transform((data) => {
    const slug = slugifyTemplateSlug(data.slug || data.name);
    if (!slug)
      throw new Error("Template slug must contain letters or numbers.");
    return {
      ...data,
      slug,
      textContent:
        data.textContent?.trim() || htmlToPlainText(data.htmlContent),
    };
  });

export async function saveEmailTemplateAction(formData: FormData) {
  const admin = await requireAdmin();
  const data = templateSchema.parse(Object.fromEntries(formData));

  if (data.templateId) {
    const existing = await db.query.emailTemplates.findFirst({
      where: eq(emailTemplates.id, data.templateId),
    });
    if (!existing || existing.workspaceId !== admin.workspaceId) {
      throw new Error("Template not found.");
    }
    await db
      .update(emailTemplates)
      .set({
        slug: data.slug,
        name: data.name,
        description: data.description || null,
        locale: data.locale,
        recipientRole: data.recipientRole,
        subject: data.subject,
        previewText: data.previewText || null,
        htmlContent: data.htmlContent,
        textContent: data.textContent,
        deletedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(emailTemplates.id, data.templateId));
    redirect(`/templates?template=${data.templateId}`);
  }

  const [template] = await db
    .insert(emailTemplates)
    .values({
      workspaceId: admin.workspaceId,
      createdBy: admin.id,
      slug: data.slug,
      name: data.name,
      description: data.description || null,
      locale: data.locale,
      recipientRole: data.recipientRole,
      subject: data.subject,
      previewText: data.previewText || null,
      htmlContent: data.htmlContent,
      textContent: data.textContent,
      deletedAt: null,
    })
    .onConflictDoUpdate({
      target: [emailTemplates.workspaceId, emailTemplates.slug],
      set: {
        name: data.name,
        description: data.description || null,
        locale: data.locale,
        recipientRole: data.recipientRole,
        subject: data.subject,
        previewText: data.previewText || null,
        htmlContent: data.htmlContent,
        textContent: data.textContent,
        deletedAt: null,
        updatedAt: new Date(),
      },
    })
    .returning({ id: emailTemplates.id });

  redirect(`/templates?template=${template.id}`);
}

const deleteTemplateSchema = z.object({
  templateId: z.string().uuid(),
});

export async function deleteEmailTemplateAction(formData: FormData) {
  const admin = await requireAdmin();
  const data = deleteTemplateSchema.parse(Object.fromEntries(formData));
  const template = await db.query.emailTemplates.findFirst({
    where: eq(emailTemplates.id, data.templateId),
  });
  if (!template || template.workspaceId !== admin.workspaceId) {
    throw new Error("Template not found.");
  }
  await db
    .update(emailTemplates)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(emailTemplates.id, data.templateId));
  redirect("/templates");
}
