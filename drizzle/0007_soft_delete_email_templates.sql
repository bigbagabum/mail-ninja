ALTER TABLE "email_templates" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "email_templates_active_workspace_idx" ON "email_templates" USING btree ("workspace_id","updated_at") WHERE "deleted_at" IS NULL;
