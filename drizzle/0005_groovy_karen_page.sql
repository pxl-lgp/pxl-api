ALTER TABLE "approvals" ADD COLUMN "last_reminder_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "last_reminder_at" timestamp with time zone;