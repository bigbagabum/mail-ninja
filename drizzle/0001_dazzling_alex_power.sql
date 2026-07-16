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