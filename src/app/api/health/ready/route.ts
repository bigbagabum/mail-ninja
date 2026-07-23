import { NextResponse } from "next/server";
import { sql } from "@/db";

export async function GET() {
  try {
    await sql`select 1`;
    const requiredColumns = await sql<{ table_name: string; column_name: string }[]>`
      select table_name, column_name
      from information_schema.columns
      where table_schema = 'public'
        and (
          (table_name = 'provider_accounts' and column_name in ('daily_send_limit', 'monthly_send_limit'))
          or (table_name = 'campaign_recipients' and column_name = 'provider_account_id')
        )
    `;
    const existing = new Set(
      requiredColumns.map((row) => `${row.table_name}.${row.column_name}`),
    );
    const missing = [
      "provider_accounts.daily_send_limit",
      "provider_accounts.monthly_send_limit",
      "campaign_recipients.provider_account_id",
    ].filter((column) => !existing.has(column));
    if (missing.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "database schema is out of date",
          missing,
          migration: "0009_provider_send_limits",
        },
        { status: 503 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 503 },
    );
  }
}
