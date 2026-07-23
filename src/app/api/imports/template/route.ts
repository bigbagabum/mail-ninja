import { NextResponse } from "next/server";
import { buildRecipientImportCsvTemplate } from "@/lib/imports/recipient-template";
import { requireAdmin } from "@/server/auth/session";

export async function GET() {
  await requireAdmin();
  return new NextResponse(buildRecipientImportCsvTemplate(), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition":
        'attachment; filename="mail-ninja-recipient-import-template.csv"',
    },
  });
}
