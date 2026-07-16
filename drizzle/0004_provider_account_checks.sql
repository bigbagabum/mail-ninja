ALTER TABLE "provider_accounts" ADD COLUMN IF NOT EXISTS "last_checked_at" timestamp with time zone;
