ALTER TABLE "workspace_tasks" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "workspace_tasks" ALTER COLUMN "status" TYPE text USING "status"::text;--> statement-breakpoint
ALTER TABLE "workspace_tasks" ALTER COLUMN "status" SET DEFAULT 'TODO';--> statement-breakpoint
DROP TYPE IF EXISTS "workspace_task_status";--> statement-breakpoint
