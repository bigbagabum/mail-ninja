ALTER TABLE "recipients" ADD COLUMN "priority_score" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "recipients" ADD COLUMN "priority_cohort" text DEFAULT 'standard' NOT NULL;--> statement-breakpoint
ALTER TABLE "recipients" ADD COLUMN "priority_source" text DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "recipients" ADD COLUMN "priority_notes" text;--> statement-breakpoint
CREATE INDEX "recipients_priority_idx" ON "recipients" USING btree ("workspace_id","priority_score","id");