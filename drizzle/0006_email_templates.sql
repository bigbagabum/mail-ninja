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
