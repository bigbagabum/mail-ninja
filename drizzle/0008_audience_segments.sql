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
