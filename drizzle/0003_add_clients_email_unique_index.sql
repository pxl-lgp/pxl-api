WITH duplicate_clients AS (
  SELECT
    "id",
    row_number() OVER (PARTITION BY lower("email") ORDER BY "created_at" DESC, "id" DESC) AS duplicate_rank
  FROM "clients"
  WHERE "email" IS NOT NULL
)
UPDATE "clients"
SET "email" = NULL
WHERE "id" IN (
  SELECT "id"
  FROM duplicate_clients
  WHERE duplicate_rank > 1
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "clients_email_unique" ON "clients" USING btree ("email");
