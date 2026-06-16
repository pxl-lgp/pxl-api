CREATE TYPE "public"."lead_score_band" AS ENUM('COLD', 'WARM', 'HOT');--> statement-breakpoint
CREATE TYPE "public"."onboarding_task_status" AS ENUM('PENDING', 'IN_PROGRESS', 'DONE');--> statement-breakpoint
CREATE TABLE "content_pillars" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"cadence_per_month" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid,
	"name" text NOT NULL,
	"content_type" text NOT NULL,
	"platform" text,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "onboarding_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" "onboarding_task_status" DEFAULT 'PENDING' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "score" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "score_band" "lead_score_band" DEFAULT 'COLD' NOT NULL;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "score_reasons" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "content_pillars" ADD CONSTRAINT "content_pillars_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_templates" ADD CONSTRAINT "content_templates_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_tasks" ADD CONSTRAINT "onboarding_tasks_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "content_pillars_client_idx" ON "content_pillars" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "onboarding_tasks_client_idx" ON "onboarding_tasks" USING btree ("client_id");