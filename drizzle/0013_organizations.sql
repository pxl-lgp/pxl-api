CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
INSERT INTO "organizations" ("id", "name", "slug")
VALUES ('00000000-0000-0000-0000-000000000001', 'PXL', 'pxl')
ON CONFLICT ("slug") DO NOTHING;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "organization_id" uuid;
--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "organization_id" uuid;
--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "organization_id" uuid;
--> statement-breakpoint
UPDATE "users" SET "organization_id" = '00000000-0000-0000-0000-000000000001' WHERE "organization_id" IS NULL;
--> statement-breakpoint
UPDATE "clients" SET "organization_id" = '00000000-0000-0000-0000-000000000001' WHERE "organization_id" IS NULL;
--> statement-breakpoint
UPDATE "leads" SET "organization_id" = '00000000-0000-0000-0000-000000000001' WHERE "organization_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "organization_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "clients" ALTER COLUMN "organization_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "leads" ALTER COLUMN "organization_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
DROP INDEX IF EXISTS "clients_email_unique";
--> statement-breakpoint
CREATE UNIQUE INDEX "clients_organization_email_unique" ON "clients" USING btree ("organization_id", "email");
--> statement-breakpoint
CREATE INDEX "clients_organization_idx" ON "clients" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX "leads_organization_idx" ON "leads" USING btree ("organization_id");
