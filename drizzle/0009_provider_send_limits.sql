ALTER TABLE "provider_accounts" ADD COLUMN "daily_send_limit" integer DEFAULT 100 NOT NULL;--> statement-breakpoint
ALTER TABLE "provider_accounts" ADD COLUMN "monthly_send_limit" integer DEFAULT 3000 NOT NULL;--> statement-breakpoint
ALTER TABLE "campaign_recipients" ADD COLUMN "provider_account_id" uuid;--> statement-breakpoint
ALTER TABLE "campaign_recipients" ADD CONSTRAINT "campaign_recipients_provider_account_id_provider_accounts_id_fk" FOREIGN KEY ("provider_account_id") REFERENCES "public"."provider_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "campaign_recipients_provider_account_idx" ON "campaign_recipients" USING btree ("provider_account_id");
