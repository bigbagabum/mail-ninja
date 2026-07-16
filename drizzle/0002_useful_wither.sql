CREATE TYPE "public"."provider_metrics_mode" AS ENUM('combined', 'by_provider_account');--> statement-breakpoint
ALTER TABLE "email_events" ADD COLUMN "provider_account_id" uuid;--> statement-breakpoint
ALTER TABLE "provider_broadcasts" ADD COLUMN "provider_account_id" uuid;--> statement-breakpoint
ALTER TABLE "provider_segments" ADD COLUMN "provider_account_id" uuid;--> statement-breakpoint
ALTER TABLE "workspace_settings" ADD COLUMN "provider_metrics_mode" "provider_metrics_mode" DEFAULT 'combined' NOT NULL;--> statement-breakpoint
ALTER TABLE "email_events" ADD CONSTRAINT "email_events_provider_account_id_provider_accounts_id_fk" FOREIGN KEY ("provider_account_id") REFERENCES "public"."provider_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_broadcasts" ADD CONSTRAINT "provider_broadcasts_provider_account_id_provider_accounts_id_fk" FOREIGN KEY ("provider_account_id") REFERENCES "public"."provider_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_segments" ADD CONSTRAINT "provider_segments_provider_account_id_provider_accounts_id_fk" FOREIGN KEY ("provider_account_id") REFERENCES "public"."provider_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "email_events_provider_account_idx" ON "email_events" USING btree ("provider_account_id");