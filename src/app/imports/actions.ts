"use server";

import { randomUUID } from "crypto";
import { mkdir, writeFile, readFile } from "fs/promises";
import path from "path";
import { redirect } from "next/navigation";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { imports } from "@/db/schema";
import { env } from "@/lib/env";
import { requireAdmin } from "@/server/auth/session";
import { analyzeCsvImport, applyImport } from "@/server/imports/csv";

export async function uploadImportAction(formData: FormData) {
  const admin = await requireAdmin();
  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("CSV file is required.");
  if (file.size > env.MAX_IMPORT_FILE_SIZE_MB * 1024 * 1024)
    throw new Error("File is too large.");
  const storedFilename = `${randomUUID()}.csv`;
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(
    path.join(uploadDir, storedFilename),
    Buffer.from(await file.arrayBuffer()),
  );
  const [imp] = await db
    .insert(imports)
    .values({
      workspaceId: admin.workspaceId,
      originalFilename: file.name,
      storedFilename,
      fileType: "csv",
      status: "uploaded",
      createdBy: admin.id,
    })
    .returning();
  redirect(`/imports/${imp.id}`);
}

export async function analyzeImportAction(formData: FormData) {
  await requireAdmin();
  const importId = z.string().uuid().parse(formData.get("importId"));
  const imp = await db.query.imports.findFirst({
    where: eq(imports.id, importId),
  });
  if (!imp) throw new Error("Import not found.");
  const mapping = {
    email: String(formData.get("email") || "email"),
    first_name: String(formData.get("first_name") || "first_name"),
    last_name: String(formData.get("last_name") || "last_name"),
    locale: String(formData.get("locale") || "locale"),
    role: String(formData.get("role") || "role"),
    tags: String(formData.get("tags") || "tags"),
    platform: String(formData.get("platform") || "platform"),
  };
  const content = await readFile(
    path.join(process.cwd(), "public", "uploads", imp.storedFilename),
    "utf8",
  );
  await analyzeCsvImport(importId, content, mapping, {
    preserveUnknownColumns: true,
    enablePriorityScoring: formData.get("enablePriorityScoring") === "true",
  });
  redirect(`/imports/${importId}`);
}

export async function applyImportAction(formData: FormData) {
  await requireAdmin();
  const importId = z.string().uuid().parse(formData.get("importId"));
  await applyImport(importId, {
    updateExisting: formData.get("mode") === "update",
  });
  redirect(`/imports/${importId}`);
}
