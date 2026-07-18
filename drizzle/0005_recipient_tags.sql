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
