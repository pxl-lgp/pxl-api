ALTER TABLE "workspace_boards" ADD COLUMN "workflow_statuses" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
