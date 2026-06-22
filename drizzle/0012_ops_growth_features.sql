ALTER TABLE "reports" ADD COLUMN "status" text DEFAULT 'DRAFT' NOT NULL;--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "sent_at" timestamp with time zone;
