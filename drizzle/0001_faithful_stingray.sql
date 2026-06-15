ALTER TABLE "content_items" ADD COLUMN "platforms" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "content_items" ADD COLUMN "media_url" text;--> statement-breakpoint
ALTER TABLE "content_items" ADD COLUMN "publish_results" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
UPDATE "content_items"
SET "platforms" = CASE
  WHEN (
    LOWER(COALESCE("platform", '')) LIKE '%facebook%'
    OR LOWER(COALESCE("platform", '')) = 'fb'
    OR LOWER(COALESCE("platform", '')) LIKE 'fb.%'
  )
    AND LOWER(COALESCE("platform", '')) LIKE '%instagram%'
    THEN '["FACEBOOK_PAGE", "INSTAGRAM"]'::jsonb
  WHEN (
    LOWER(COALESCE("platform", '')) LIKE '%facebook%'
    OR LOWER(COALESCE("platform", '')) = 'fb'
    OR LOWER(COALESCE("platform", '')) LIKE 'fb.%'
  )
    THEN '["FACEBOOK_PAGE"]'::jsonb
  WHEN LOWER(COALESCE("platform", '')) LIKE '%instagram%'
    THEN '["INSTAGRAM"]'::jsonb
  ELSE '[]'::jsonb
END;
