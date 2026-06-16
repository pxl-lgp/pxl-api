CREATE TYPE "public"."campaign_status" AS ENUM('PLANNED', 'ACTIVE', 'PAUSED', 'COMPLETED');--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"name" text NOT NULL,
	"status" "campaign_status" DEFAULT 'PLANNED' NOT NULL,
	"goal" text,
	"budget" text,
	"audience" text,
	"offer" text,
	"notes" text,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "content_items" ADD COLUMN "campaign_id" uuid;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "campaigns_client_idx" ON "campaigns" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "content_items_campaign_idx" ON "content_items" USING btree ("campaign_id");
