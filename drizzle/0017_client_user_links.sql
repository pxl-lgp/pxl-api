ALTER TABLE "clients" ADD COLUMN "user_id" uuid;
--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
UPDATE "clients"
SET "user_id" = "users"."id", "updated_at" = now()
FROM "users"
WHERE "clients"."user_id" IS NULL
  AND "users"."role" = 'CLIENT'
  AND "users"."organization_id" = "clients"."organization_id"
  AND lower("users"."email") = lower("clients"."email");
--> statement-breakpoint
CREATE UNIQUE INDEX "clients_user_id_unique" ON "clients" USING btree ("user_id");
