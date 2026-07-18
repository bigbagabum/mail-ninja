import { parse } from "csv-parse/sync";
import { db } from "@/db";
import {
  importRows,
  imports,
  recipients,
  recipientTagAssignments,
  recipientTags,
  suppressions,
} from "@/db/schema";
import {
  normalizeEmail,
  isValidEmail,
  normalizeLocale,
  parseBoolean,
  parseDate,
} from "@/lib/normalization";
import { and, eq, inArray } from "drizzle-orm";
import { parseTagList } from "@/lib/tags";
import { scoreRecipientPriority } from "./priority";

export type ImportOptions = {
  updateExisting?: boolean;
  preserveUnknownColumns?: boolean;
  overwriteEmpty?: boolean;
  enablePriorityScoring?: boolean;
};

function detectDelimiter(input: string) {
  const firstLine = input.split(/\r?\n/, 1)[0] ?? "";
  return firstLine.split(";").length > firstLine.split(",").length ? ";" : ",";
}

export async function analyzeCsvImport(
  importId: string,
  content: string,
  mapping: Record<string, string>,
  options: ImportOptions = {},
) {
  const imp = await db.query.imports.findFirst({
    where: eq(imports.id, importId),
  });
  if (!imp) throw new Error("Import not found.");
  const rows = parse(content.replace(/^\uFEFF/, ""), {
    columns: true,
    skip_empty_lines: true,
    delimiter: detectDelimiter(content),
    relax_quotes: true,
  }) as Record<string, string>[];
  const seen = new Set<string>();
  const emails = rows
    .map((row) => normalizeEmail(row[mapping.email] ?? ""))
    .filter(Boolean);
  const existingRecipients = emails.length
    ? await db.query.recipients.findMany({
        where: and(
          eq(recipients.workspaceId, imp.workspaceId),
          inArray(recipients.normalizedEmail, emails),
        ),
      })
    : [];
  const existingSuppressions = emails.length
    ? await db.query.suppressions.findMany({
        where: and(
          eq(suppressions.workspaceId, imp.workspaceId),
          inArray(suppressions.normalizedEmail, emails),
        ),
      })
    : [];
  const recipientMap = new Map(
    existingRecipients.map((recipient) => [
      recipient.normalizedEmail,
      recipient.id,
    ]),
  );
  const suppressionSet = new Set(
    existingSuppressions.map((suppression) => suppression.normalizedEmail),
  );
  let valid = 0,
    invalid = 0,
    duplicate = 0,
    suppressed = 0;
  const values = rows.map((row, index) => {
    const email = normalizeEmail(row[mapping.email] ?? "");
    const errors: string[] = [];
    if (!email || !isValidEmail(email)) errors.push("Invalid email");
    let status: typeof importRows.$inferInsert.status = "valid";
    if (errors.length) {
      status = "invalid";
      invalid += 1;
    } else if (seen.has(email)) {
      status = "duplicate_in_file";
      duplicate += 1;
    } else if (suppressionSet.has(email)) {
      status = "suppressed";
      suppressed += 1;
    } else if (recipientMap.has(email)) {
      status = "duplicate_in_database";
      duplicate += 1;
    } else valid += 1;
    seen.add(email);
    const emailVerified = parseBoolean(row[mapping.email_verified]);
    const marketingConsent = parseBoolean(row[mapping.marketing_consent]);
    const lastActiveAt = parseDate(row[mapping.last_active_at]);
    const locale = normalizeLocale(row[mapping.locale]);
    const tags = parseTagList(row[mapping.tags]);
    const normalizedData = {
      email,
      externalId: row[mapping.external_id],
      firstName: row[mapping.first_name],
      lastName: row[mapping.last_name],
      locale,
      role: row[mapping.role],
      tags,
      platform: row[mapping.platform],
      emailVerified,
      marketingConsent,
      lastActiveAt: lastActiveAt?.toISOString(),
      ...(options.enablePriorityScoring
        ? scoreRecipientPriority({
            emailVerified,
            marketingConsent,
            lastActiveAt,
            locale,
            role: row[mapping.role],
            platform: row[mapping.platform],
            externalId: row[mapping.external_id],
          })
        : {}),
    };
    return {
      importId,
      rowNumber: index + 2,
      rawData: row,
      normalizedData,
      status,
      validationErrors: errors,
      duplicateOfRecipientId: recipientMap.get(email),
    };
  });
  if (values.length) await db.insert(importRows).values(values);
  await db
    .update(imports)
    .set({
      status: "ready",
      totalRows: rows.length,
      validRows: valid,
      invalidRows: invalid,
      duplicateRows: duplicate,
      suppressedRows: suppressed,
      updatedAt: new Date(),
    })
    .where(eq(imports.id, importId));
}

export async function applyImport(
  importId: string,
  options: ImportOptions = {},
) {
  const imp = await db.query.imports.findFirst({
    where: eq(imports.id, importId),
  });
  if (!imp) throw new Error("Import not found.");
  const rows = await db.query.importRows.findMany({
    where: eq(importRows.importId, importId),
  });
  let imported = 0;
  await db.transaction(async (tx) => {
    for (const row of rows.filter(
      (item) =>
        item.status === "valid" ||
        (options.updateExisting && item.status === "duplicate_in_database"),
    )) {
      const data = row.normalizedData as Record<string, unknown>;
      if (!data.email || typeof data.email !== "string") continue;
      const importedTags = Array.isArray(data.tags)
        ? data.tags.filter((tag): tag is { name: string; slug: string } => {
            return (
              typeof tag === "object" &&
              tag !== null &&
              "name" in tag &&
              "slug" in tag &&
              typeof tag.name === "string" &&
              typeof tag.slug === "string"
            );
          })
        : [];
      const primaryTag = importedTags[0]?.slug;
      const role =
        primaryTag ?? (typeof data.role === "string" ? data.role : null);
      const values = {
        workspaceId: imp.workspaceId,
        email: data.email,
        normalizedEmail: data.email,
        externalId:
          typeof data.externalId === "string" ? data.externalId : null,
        firstName: typeof data.firstName === "string" ? data.firstName : null,
        lastName: typeof data.lastName === "string" ? data.lastName : null,
        locale: typeof data.locale === "string" ? data.locale : null,
        role,
        platform: typeof data.platform === "string" ? data.platform : null,
        emailVerified:
          typeof data.emailVerified === "boolean" ? data.emailVerified : null,
        marketingConsent:
          typeof data.marketingConsent === "boolean"
            ? data.marketingConsent
            : null,
        lastActiveAt:
          typeof data.lastActiveAt === "string"
            ? new Date(data.lastActiveAt)
            : null,
        priorityScore:
          typeof data.priorityScore === "number" ? data.priorityScore : 0,
        priorityCohort:
          typeof data.priorityCohort === "string"
            ? data.priorityCohort
            : "standard",
        prioritySource:
          typeof data.prioritySource === "string"
            ? data.prioritySource
            : "manual",
        priorityNotes:
          typeof data.priorityNotes === "string" ? data.priorityNotes : null,
      };
      const [recipient] = await tx
        .insert(recipients)
        .values(values)
        .onConflictDoUpdate({
          target: [recipients.workspaceId, recipients.normalizedEmail],
          set: options.updateExisting ? values : { updatedAt: new Date() },
        })
        .returning();
      if (importedTags.length > 0) {
        await tx
          .insert(recipientTags)
          .values(
            importedTags.map((tag) => ({
              workspaceId: imp.workspaceId,
              name: tag.name,
              slug: tag.slug,
              color: "teal",
            })),
          )
          .onConflictDoNothing();
        const savedTags = await tx.query.recipientTags.findMany({
          where: and(
            eq(recipientTags.workspaceId, imp.workspaceId),
            inArray(
              recipientTags.slug,
              importedTags.map((tag) => tag.slug),
            ),
          ),
        });
        if (savedTags.length > 0) {
          await tx
            .insert(recipientTagAssignments)
            .values(
              savedTags.map((tag) => ({
                workspaceId: imp.workspaceId,
                recipientId: recipient.id,
                tagId: tag.id,
              })),
            )
            .onConflictDoNothing();
        }
      }
      await tx
        .update(importRows)
        .set({ status: "imported", recipientId: recipient.id })
        .where(eq(importRows.id, row.id));
      imported += 1;
    }
    await tx
      .update(imports)
      .set({
        status: "completed",
        importedRows: imported,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(imports.id, importId));
  });
}
