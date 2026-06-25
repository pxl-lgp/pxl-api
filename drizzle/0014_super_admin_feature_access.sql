ALTER TYPE "user_role" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';
--> statement-breakpoint
CREATE TABLE "organization_feature_access" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"feature_key" text NOT NULL,
	"enabled" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "organization_feature_access" ADD CONSTRAINT "organization_feature_access_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "organization_feature_access_unique" ON "organization_feature_access" USING btree ("organization_id", "feature_key");
