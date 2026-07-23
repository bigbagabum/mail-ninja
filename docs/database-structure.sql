-- Mail Ninja database structure
-- Generated from Drizzle migrations.
-- Source directory: drizzle/
--
-- Regenerate with: npm run db:structure
-- Verify freshness with: npm run db:structure:check
--
-- This file is intended for creating a fresh PostgreSQL database schema,
-- for example by pasting it into a SQL editor during manual setup.


-- ============================================================
-- Migration: 0000_jittery_dexter_bennett.sql
-- ============================================================
CREATE TYPE "public"."campaign_recipient_status" AS ENUM('pending', 'excluded', 'prepared', 'synced', 'scheduled', 'sent', 'delivered', 'delayed', 'opened', 'clicked', 'bounced', 'complained', 'unsubscribed', 'suppressed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."campaign_status" AS ENUM('draft', 'preparing', 'ready', 'sending', 'paused', 'completed', 'cancelled', 'failed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."campaign_type" AS ENUM('service_update', 'marketing', 'newsletter', 'announcement');--> statement-breakpoint
CREATE TYPE "public"."email_event_type" AS ENUM('sent', 'delivered', 'delivery_delayed', 'opened', 'clicked', 'bounced', 'complained', 'failed', 'suppressed', 'unsubscribed', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."event_processing_status" AS ENUM('received', 'queued', 'processed', 'ignored', 'failed');--> statement-breakpoint
CREATE TYPE "public"."import_row_status" AS ENUM('pending', 'valid', 'invalid', 'duplicate_in_file', 'duplicate_in_database', 'suppressed', 'imported', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."import_status" AS ENUM('uploaded', 'analyzing', 'awaiting_mapping', 'ready', 'importing', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('pending', 'running', 'retrying', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."job_type" AS ENUM('analyze_import', 'apply_import', 'prepare_campaign', 'sync_contacts', 'create_provider_segment', 'populate_provider_segment', 'create_provider_broadcast', 'send_provider_broadcast', 'process_webhook_event', 'recalculate_campaign_analytics', 'cleanup_import_data');--> statement-breakpoint
CREATE TYPE "public"."suppression_reason" AS ENUM('manual', 'unsubscribe', 'hard_bounce', 'soft_bounce_limit', 'complaint', 'provider_suppressed', 'invalid_email', 'deleted_recipient', 'other');--> statement-breakpoint
CREATE TYPE "public"."wave_status" AS ENUM('draft', 'ready', 'sending', 'paused', 'completed', 'cancelled', 'failed');--> statement-breakpoint
CREATE TABLE "admin_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"last_seen_at" timestamp with time zone,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"email" text NOT NULL,
	"normalized_email" text NOT NULL,
	"password_hash" text NOT NULL,
	"display_name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_users_workspace_id_normalized_email_unique" UNIQUE("workspace_id","normalized_email")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"admin_user_id" uuid,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ip_address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_analytics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"wave_id" uuid,
	"variant_id" uuid,
	"dimension_type" text NOT NULL,
	"dimension_value" text NOT NULL,
	"selected_count" integer DEFAULT 0 NOT NULL,
	"prepared_count" integer DEFAULT 0 NOT NULL,
	"sent_count" integer DEFAULT 0 NOT NULL,
	"delivered_count" integer DEFAULT 0 NOT NULL,
	"unique_opened_count" integer DEFAULT 0 NOT NULL,
	"total_open_count" integer DEFAULT 0 NOT NULL,
	"unique_clicked_count" integer DEFAULT 0 NOT NULL,
	"total_click_count" integer DEFAULT 0 NOT NULL,
	"delayed_count" integer DEFAULT 0 NOT NULL,
	"bounced_count" integer DEFAULT 0 NOT NULL,
	"complained_count" integer DEFAULT 0 NOT NULL,
	"unsubscribed_count" integer DEFAULT 0 NOT NULL,
	"suppressed_count" integer DEFAULT 0 NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"calculated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "campaign_analytics_campaign_id_wave_id_variant_id_dimension_type_dimension_value_unique" UNIQUE("campaign_id","wave_id","variant_id","dimension_type","dimension_value")
);
--> statement-breakpoint
CREATE TABLE "campaign_recipients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"recipient_id" uuid NOT NULL,
	"variant_id" uuid,
	"wave_id" uuid,
	"status" "campaign_recipient_status" DEFAULT 'pending' NOT NULL,
	"provider_contact_id" text,
	"provider_message_id" text,
	"prepared_at" timestamp with time zone,
	"synced_at" timestamp with time zone,
	"scheduled_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"delivery_delayed_at" timestamp with time zone,
	"first_opened_at" timestamp with time zone,
	"last_opened_at" timestamp with time zone,
	"first_clicked_at" timestamp with time zone,
	"last_clicked_at" timestamp with time zone,
	"bounced_at" timestamp with time zone,
	"complained_at" timestamp with time zone,
	"unsubscribed_at" timestamp with time zone,
	"suppressed_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"open_count" integer DEFAULT 0 NOT NULL,
	"click_count" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "campaign_recipients_campaign_id_recipient_id_unique" UNIQUE("campaign_id","recipient_id")
);
--> statement-breakpoint
CREATE TABLE "campaign_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"recipient_role" text DEFAULT 'generic' NOT NULL,
	"name" text NOT NULL,
	"subject" text NOT NULL,
	"preview_text" text,
	"html_content" text NOT NULL,
	"text_content" text,
	"is_fallback" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "campaign_variants_campaign_id_locale_recipient_role_unique" UNIQUE("campaign_id","locale","recipient_role")
);
--> statement-breakpoint
CREATE TABLE "campaign_waves" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"name" text NOT NULL,
	"position" integer NOT NULL,
	"status" "wave_status" DEFAULT 'draft' NOT NULL,
	"recipient_limit" integer,
	"scheduled_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "campaign_waves_campaign_id_position_unique" UNIQUE("campaign_id","position")
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"campaign_key" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"campaign_type" "campaign_type" NOT NULL,
	"status" "campaign_status" DEFAULT 'draft' NOT NULL,
	"default_locale" text DEFAULT 'en' NOT NULL,
	"from_name" text NOT NULL,
	"from_email" text NOT NULL,
	"reply_to" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"scheduled_at" timestamp with time zone,
	"prepared_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "campaigns_workspace_id_campaign_key_unique" UNIQUE("workspace_id","campaign_key")
);
--> statement-breakpoint
CREATE TABLE "email_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"provider_event_id" text NOT NULL,
	"provider_message_id" text,
	"provider_broadcast_id" text,
	"campaign_id" uuid,
	"campaign_recipient_id" uuid,
	"recipient_id" uuid,
	"event_type" "email_event_type" NOT NULL,
	"event_timestamp" timestamp with time zone NOT NULL,
	"email" text,
	"clicked_url" text,
	"clicked_url_normalized" text,
	"link_category" text,
	"user_agent" text,
	"ip_address" text,
	"raw_payload" jsonb NOT NULL,
	"processing_status" "event_processing_status" DEFAULT 'received' NOT NULL,
	"processing_error" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	CONSTRAINT "email_events_provider_provider_event_id_unique" UNIQUE("provider","provider_event_id")
);
--> statement-breakpoint
CREATE TABLE "import_rows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"import_id" uuid NOT NULL,
	"row_number" integer NOT NULL,
	"raw_data" jsonb NOT NULL,
	"normalized_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "import_row_status" DEFAULT 'pending' NOT NULL,
	"validation_errors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"duplicate_of_recipient_id" uuid,
	"recipient_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "import_rows_import_id_row_number_unique" UNIQUE("import_id","row_number")
);
--> statement-breakpoint
CREATE TABLE "imports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"original_filename" text NOT NULL,
	"stored_filename" text NOT NULL,
	"file_type" text DEFAULT 'csv' NOT NULL,
	"status" "import_status" DEFAULT 'uploaded' NOT NULL,
	"column_mapping" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"import_options" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"total_rows" integer DEFAULT 0 NOT NULL,
	"valid_rows" integer DEFAULT 0 NOT NULL,
	"invalid_rows" integer DEFAULT 0 NOT NULL,
	"duplicate_rows" integer DEFAULT 0 NOT NULL,
	"suppressed_rows" integer DEFAULT 0 NOT NULL,
	"imported_rows" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"error_message" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"type" "job_type" NOT NULL,
	"status" "job_status" DEFAULT 'pending' NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"result" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"priority" integer DEFAULT 100 NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 5 NOT NULL,
	"run_after" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_at" timestamp with time zone,
	"locked_by" text,
	"last_error" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_broadcasts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"campaign_id" uuid NOT NULL,
	"wave_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"provider_segment_id" uuid,
	"provider" text NOT NULL,
	"provider_broadcast_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"recipient_count" integer DEFAULT 0 NOT NULL,
	"scheduled_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"last_error" text,
	"provider_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "provider_broadcasts_campaign_id_wave_id_variant_id_unique" UNIQUE("campaign_id","wave_id","variant_id")
);
--> statement-breakpoint
CREATE TABLE "provider_segments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"campaign_id" uuid NOT NULL,
	"wave_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"provider_segment_id" text,
	"name" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"recipient_count" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"email" text NOT NULL,
	"normalized_email" text NOT NULL,
	"external_id" text,
	"first_name" text,
	"last_name" text,
	"locale" text,
	"role" text,
	"platform" text,
	"email_verified" boolean,
	"marketing_consent" boolean,
	"last_active_at" timestamp with time zone,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recipients_workspace_id_normalized_email_unique" UNIQUE("workspace_id","normalized_email")
);
--> statement-breakpoint
CREATE TABLE "suppressions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"email" text NOT NULL,
	"normalized_email" text NOT NULL,
	"reason" "suppression_reason" NOT NULL,
	"source" text NOT NULL,
	"campaign_id" uuid,
	"email_event_id" uuid,
	"is_permanent" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp with time zone,
	"notes" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "suppressions_workspace_id_normalized_email_unique" UNIQUE("workspace_id","normalized_email")
);
--> statement-breakpoint
CREATE TABLE "workspace_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"product_name" text DEFAULT 'Campaign Mailer' NOT NULL,
	"public_base_url" text,
	"default_from_name" text,
	"default_from_email" text,
	"default_reply_to" text,
	"default_locale" text DEFAULT 'en' NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"provider" text DEFAULT 'resend' NOT NULL,
	"provider_settings_encrypted" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_settings_workspace_id_unique" UNIQUE("workspace_id")
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"default_locale" text DEFAULT 'en' NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspaces_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_admin_user_id_admin_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."admin_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_users" ADD CONSTRAINT "admin_users_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_admin_user_id_admin_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_analytics" ADD CONSTRAINT "campaign_analytics_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_analytics" ADD CONSTRAINT "campaign_analytics_wave_id_campaign_waves_id_fk" FOREIGN KEY ("wave_id") REFERENCES "public"."campaign_waves"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_analytics" ADD CONSTRAINT "campaign_analytics_variant_id_campaign_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."campaign_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_recipients" ADD CONSTRAINT "campaign_recipients_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_recipients" ADD CONSTRAINT "campaign_recipients_recipient_id_recipients_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."recipients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_recipients" ADD CONSTRAINT "campaign_recipients_variant_id_campaign_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."campaign_variants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_recipients" ADD CONSTRAINT "campaign_recipients_wave_id_campaign_waves_id_fk" FOREIGN KEY ("wave_id") REFERENCES "public"."campaign_waves"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_variants" ADD CONSTRAINT "campaign_variants_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_waves" ADD CONSTRAINT "campaign_waves_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_created_by_admin_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_events" ADD CONSTRAINT "email_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_events" ADD CONSTRAINT "email_events_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_events" ADD CONSTRAINT "email_events_campaign_recipient_id_campaign_recipients_id_fk" FOREIGN KEY ("campaign_recipient_id") REFERENCES "public"."campaign_recipients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_events" ADD CONSTRAINT "email_events_recipient_id_recipients_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."recipients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_rows" ADD CONSTRAINT "import_rows_import_id_imports_id_fk" FOREIGN KEY ("import_id") REFERENCES "public"."imports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_rows" ADD CONSTRAINT "import_rows_duplicate_of_recipient_id_recipients_id_fk" FOREIGN KEY ("duplicate_of_recipient_id") REFERENCES "public"."recipients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_rows" ADD CONSTRAINT "import_rows_recipient_id_recipients_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."recipients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imports" ADD CONSTRAINT "imports_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imports" ADD CONSTRAINT "imports_created_by_admin_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_broadcasts" ADD CONSTRAINT "provider_broadcasts_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_broadcasts" ADD CONSTRAINT "provider_broadcasts_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_broadcasts" ADD CONSTRAINT "provider_broadcasts_wave_id_campaign_waves_id_fk" FOREIGN KEY ("wave_id") REFERENCES "public"."campaign_waves"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_broadcasts" ADD CONSTRAINT "provider_broadcasts_variant_id_campaign_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."campaign_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_broadcasts" ADD CONSTRAINT "provider_broadcasts_provider_segment_id_provider_segments_id_fk" FOREIGN KEY ("provider_segment_id") REFERENCES "public"."provider_segments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_segments" ADD CONSTRAINT "provider_segments_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_segments" ADD CONSTRAINT "provider_segments_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_segments" ADD CONSTRAINT "provider_segments_wave_id_campaign_waves_id_fk" FOREIGN KEY ("wave_id") REFERENCES "public"."campaign_waves"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_segments" ADD CONSTRAINT "provider_segments_variant_id_campaign_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."campaign_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipients" ADD CONSTRAINT "recipients_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppressions" ADD CONSTRAINT "suppressions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppressions" ADD CONSTRAINT "suppressions_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppressions" ADD CONSTRAINT "suppressions_email_event_id_email_events_id_fk" FOREIGN KEY ("email_event_id") REFERENCES "public"."email_events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppressions" ADD CONSTRAINT "suppressions_created_by_admin_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_settings" ADD CONSTRAINT "workspace_settings_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_sessions_expires_idx" ON "admin_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "campaign_recipients_message_idx" ON "campaign_recipients" USING btree ("provider_message_id");--> statement-breakpoint
CREATE INDEX "campaigns_workspace_idx" ON "campaigns" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "email_events_message_idx" ON "email_events" USING btree ("provider_message_id");--> statement-breakpoint
CREATE INDEX "email_events_campaign_idx" ON "email_events" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "import_rows_import_idx" ON "import_rows" USING btree ("import_id");--> statement-breakpoint
CREATE INDEX "jobs_claim_idx" ON "jobs" USING btree ("status","run_after","priority");--> statement-breakpoint
CREATE INDEX "recipients_workspace_idx" ON "recipients" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "suppressions_active_idx" ON "suppressions" USING btree ("workspace_id","normalized_email","expires_at");

-- ============================================================
-- Migration: 0001_dazzling_alex_power.sql
-- ============================================================
CREATE TYPE "public"."provider_account_status" AS ENUM('active', 'paused', 'failed');--> statement-breakpoint
CREATE TYPE "public"."provider_routing_strategy" AS ENUM('sequential', 'parallel');--> statement-breakpoint
CREATE TABLE "provider_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"provider" text DEFAULT 'resend' NOT NULL,
	"name" text NOT NULL,
	"api_key_encrypted" text NOT NULL,
	"api_key_hint" text NOT NULL,
	"webhook_secret_encrypted" text,
	"status" "provider_account_status" DEFAULT 'active' NOT NULL,
	"routing_order" integer DEFAULT 100 NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"last_used_at" timestamp with time zone,
	"last_error" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "provider_accounts_workspace_id_provider_name_unique" UNIQUE("workspace_id","provider","name")
);
--> statement-breakpoint
ALTER TABLE "workspace_settings" ALTER COLUMN "product_name" SET DEFAULT 'Mail Ninja';--> statement-breakpoint
ALTER TABLE "workspace_settings" ADD COLUMN "provider_routing_strategy" "provider_routing_strategy" DEFAULT 'sequential' NOT NULL;--> statement-breakpoint
ALTER TABLE "provider_accounts" ADD CONSTRAINT "provider_accounts_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_accounts" ADD CONSTRAINT "provider_accounts_created_by_admin_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "provider_accounts_workspace_provider_idx" ON "provider_accounts" USING btree ("workspace_id","provider","status");

-- ============================================================
-- Migration: 0002_useful_wither.sql
-- ============================================================
CREATE TYPE "public"."provider_metrics_mode" AS ENUM('combined', 'by_provider_account');--> statement-breakpoint
ALTER TABLE "email_events" ADD COLUMN "provider_account_id" uuid;--> statement-breakpoint
ALTER TABLE "provider_broadcasts" ADD COLUMN "provider_account_id" uuid;--> statement-breakpoint
ALTER TABLE "provider_segments" ADD COLUMN "provider_account_id" uuid;--> statement-breakpoint
ALTER TABLE "workspace_settings" ADD COLUMN "provider_metrics_mode" "provider_metrics_mode" DEFAULT 'combined' NOT NULL;--> statement-breakpoint
ALTER TABLE "email_events" ADD CONSTRAINT "email_events_provider_account_id_provider_accounts_id_fk" FOREIGN KEY ("provider_account_id") REFERENCES "public"."provider_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_broadcasts" ADD CONSTRAINT "provider_broadcasts_provider_account_id_provider_accounts_id_fk" FOREIGN KEY ("provider_account_id") REFERENCES "public"."provider_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_segments" ADD CONSTRAINT "provider_segments_provider_account_id_provider_accounts_id_fk" FOREIGN KEY ("provider_account_id") REFERENCES "public"."provider_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "email_events_provider_account_idx" ON "email_events" USING btree ("provider_account_id");

-- ============================================================
-- Migration: 0003_wide_tag.sql
-- ============================================================
ALTER TABLE "recipients" ADD COLUMN "priority_score" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "recipients" ADD COLUMN "priority_cohort" text DEFAULT 'standard' NOT NULL;--> statement-breakpoint
ALTER TABLE "recipients" ADD COLUMN "priority_source" text DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "recipients" ADD COLUMN "priority_notes" text;--> statement-breakpoint
CREATE INDEX "recipients_priority_idx" ON "recipients" USING btree ("workspace_id","priority_score","id");

-- ============================================================
-- Migration: 0004_provider_account_checks.sql
-- ============================================================
ALTER TABLE "provider_accounts" ADD COLUMN IF NOT EXISTS "last_checked_at" timestamp with time zone;

-- ============================================================
-- Migration: 0005_recipient_tags.sql
-- ============================================================
CREATE TABLE IF NOT EXISTS "recipient_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"color" text DEFAULT 'teal' NOT NULL,
	"description" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recipient_tags_workspace_id_slug_unique" UNIQUE("workspace_id","slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "recipient_tag_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"recipient_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recipient_tag_assignments_recipient_id_tag_id_unique" UNIQUE("recipient_id","tag_id")
);
--> statement-breakpoint
ALTER TABLE "recipient_tags" ADD CONSTRAINT "recipient_tags_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "recipient_tags" ADD CONSTRAINT "recipient_tags_created_by_admin_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "recipient_tag_assignments" ADD CONSTRAINT "recipient_tag_assignments_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "recipient_tag_assignments" ADD CONSTRAINT "recipient_tag_assignments_recipient_id_recipients_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."recipients"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "recipient_tag_assignments" ADD CONSTRAINT "recipient_tag_assignments_tag_id_recipient_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."recipient_tags"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "recipient_tag_assignments" ADD CONSTRAINT "recipient_tag_assignments_created_by_admin_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recipient_tags_workspace_idx" ON "recipient_tags" USING btree ("workspace_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recipient_tag_assignments_workspace_idx" ON "recipient_tag_assignments" USING btree ("workspace_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recipient_tag_assignments_recipient_idx" ON "recipient_tag_assignments" USING btree ("recipient_id");

-- ============================================================
-- Migration: 0006_email_templates.sql
-- ============================================================
CREATE TABLE IF NOT EXISTS "email_templates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "slug" text NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "locale" text DEFAULT 'en' NOT NULL,
  "recipient_role" text DEFAULT 'generic' NOT NULL,
  "subject" text NOT NULL,
  "preview_text" text,
  "html_content" text NOT NULL,
  "text_content" text,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "email_templates_workspace_id_slug_unique" UNIQUE("workspace_id","slug")
);
--> statement-breakpoint
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_created_by_admin_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "email_templates_workspace_idx" ON "email_templates" USING btree ("workspace_id");

-- ============================================================
-- Migration: 0007_soft_delete_email_templates.sql
-- ============================================================
ALTER TABLE "email_templates" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "email_templates_active_workspace_idx" ON "email_templates" USING btree ("workspace_id","updated_at") WHERE "deleted_at" IS NULL;

-- ============================================================
-- Migration: 0008_audience_segments.sql
-- ============================================================
CREATE TYPE "public"."audience_segment_type" AS ENUM('manual', 'dynamic');--> statement-breakpoint
CREATE TYPE "public"."segment_tag_match_mode" AS ENUM('any', 'all');--> statement-breakpoint
CREATE TABLE "audience_segments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"segment_type" "audience_segment_type" NOT NULL,
	"tag_match_mode" "segment_tag_match_mode" DEFAULT 'any' NOT NULL,
	"rules" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audience_segment_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"segment_id" uuid NOT NULL,
	"recipient_id" uuid NOT NULL,
	"added_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audience_segments" ADD CONSTRAINT "audience_segments_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audience_segments" ADD CONSTRAINT "audience_segments_updated_by_admin_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audience_segment_members" ADD CONSTRAINT "audience_segment_members_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audience_segment_members" ADD CONSTRAINT "audience_segment_members_segment_id_audience_segments_id_fk" FOREIGN KEY ("segment_id") REFERENCES "public"."audience_segments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audience_segment_members" ADD CONSTRAINT "audience_segment_members_recipient_id_recipients_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."recipients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audience_segment_members" ADD CONSTRAINT "audience_segment_members_added_by_admin_users_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audience_segments" ADD CONSTRAINT "audience_segments_workspace_id_slug_unique" UNIQUE("workspace_id","slug");--> statement-breakpoint
ALTER TABLE "audience_segment_members" ADD CONSTRAINT "audience_segment_members_segment_id_recipient_id_unique" UNIQUE("segment_id","recipient_id");--> statement-breakpoint
CREATE INDEX "audience_segments_workspace_idx" ON "audience_segments" USING btree ("workspace_id","segment_type");--> statement-breakpoint
CREATE INDEX "audience_segment_members_workspace_idx" ON "audience_segment_members" USING btree ("workspace_id","segment_id");--> statement-breakpoint
CREATE INDEX "audience_segment_members_recipient_idx" ON "audience_segment_members" USING btree ("recipient_id");

