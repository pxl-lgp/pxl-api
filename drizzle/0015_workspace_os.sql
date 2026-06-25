CREATE TYPE "workspace_channel_type" AS ENUM('GENERAL', 'CLIENT', 'PROJECT', 'SYSTEM');--> statement-breakpoint
CREATE TYPE "workspace_visibility" AS ENUM('PUBLIC', 'PRIVATE');--> statement-breakpoint
CREATE TYPE "workspace_member_role" AS ENUM('OWNER', 'MEMBER');--> statement-breakpoint
CREATE TYPE "workspace_task_status" AS ENUM('TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'BLOCKED');--> statement-breakpoint
CREATE TYPE "workspace_task_priority" AS ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT');--> statement-breakpoint
CREATE TABLE "workspace_channels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"type" "workspace_channel_type" DEFAULT 'GENERAL' NOT NULL,
	"visibility" "workspace_visibility" DEFAULT 'PUBLIC' NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_channel_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "workspace_member_role" DEFAULT 'MEMBER' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"channel_id" uuid NOT NULL,
	"author_user_id" uuid,
	"body" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_boards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"board_id" uuid,
	"client_id" uuid,
	"campaign_id" uuid,
	"content_item_id" uuid,
	"lead_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"status" "workspace_task_status" DEFAULT 'TODO' NOT NULL,
	"priority" "workspace_task_priority" DEFAULT 'MEDIUM' NOT NULL,
	"assignee_user_id" uuid,
	"reporter_user_id" uuid,
	"due_at" timestamp with time zone,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"parent_page_id" uuid,
	"client_id" uuid,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"icon" text,
	"content" jsonb DEFAULT '{"format":"markdown","text":""}'::jsonb NOT NULL,
	"visibility" "workspace_visibility" DEFAULT 'PUBLIC' NOT NULL,
	"created_by_user_id" uuid,
	"updated_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workspace_channels" ADD CONSTRAINT "workspace_channels_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_channels" ADD CONSTRAINT "workspace_channels_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_channels" ADD CONSTRAINT "workspace_channels_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_channel_members" ADD CONSTRAINT "workspace_channel_members_channel_id_workspace_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."workspace_channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_channel_members" ADD CONSTRAINT "workspace_channel_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_messages" ADD CONSTRAINT "workspace_messages_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_messages" ADD CONSTRAINT "workspace_messages_channel_id_workspace_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."workspace_channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_messages" ADD CONSTRAINT "workspace_messages_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_boards" ADD CONSTRAINT "workspace_boards_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_boards" ADD CONSTRAINT "workspace_boards_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_boards" ADD CONSTRAINT "workspace_boards_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_tasks" ADD CONSTRAINT "workspace_tasks_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_tasks" ADD CONSTRAINT "workspace_tasks_board_id_workspace_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."workspace_boards"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_tasks" ADD CONSTRAINT "workspace_tasks_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_tasks" ADD CONSTRAINT "workspace_tasks_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_tasks" ADD CONSTRAINT "workspace_tasks_content_item_id_content_items_id_fk" FOREIGN KEY ("content_item_id") REFERENCES "public"."content_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_tasks" ADD CONSTRAINT "workspace_tasks_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_tasks" ADD CONSTRAINT "workspace_tasks_assignee_user_id_users_id_fk" FOREIGN KEY ("assignee_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_tasks" ADD CONSTRAINT "workspace_tasks_reporter_user_id_users_id_fk" FOREIGN KEY ("reporter_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_pages" ADD CONSTRAINT "workspace_pages_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_pages" ADD CONSTRAINT "workspace_pages_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_pages" ADD CONSTRAINT "workspace_pages_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_pages" ADD CONSTRAINT "workspace_pages_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_channels_organization_slug_unique" ON "workspace_channels" USING btree ("organization_id", "slug");--> statement-breakpoint
CREATE INDEX "workspace_channels_organization_idx" ON "workspace_channels" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "workspace_channels_client_idx" ON "workspace_channels" USING btree ("client_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_channel_members_channel_user_unique" ON "workspace_channel_members" USING btree ("channel_id", "user_id");--> statement-breakpoint
CREATE INDEX "workspace_channel_members_channel_idx" ON "workspace_channel_members" USING btree ("channel_id");--> statement-breakpoint
CREATE INDEX "workspace_messages_channel_idx" ON "workspace_messages" USING btree ("channel_id");--> statement-breakpoint
CREATE INDEX "workspace_messages_organization_idx" ON "workspace_messages" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_boards_organization_slug_unique" ON "workspace_boards" USING btree ("organization_id", "slug");--> statement-breakpoint
CREATE INDEX "workspace_boards_organization_idx" ON "workspace_boards" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "workspace_tasks_organization_idx" ON "workspace_tasks" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "workspace_tasks_board_idx" ON "workspace_tasks" USING btree ("board_id");--> statement-breakpoint
CREATE INDEX "workspace_tasks_assignee_idx" ON "workspace_tasks" USING btree ("assignee_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_pages_organization_slug_unique" ON "workspace_pages" USING btree ("organization_id", "slug");--> statement-breakpoint
CREATE INDEX "workspace_pages_organization_idx" ON "workspace_pages" USING btree ("organization_id");
