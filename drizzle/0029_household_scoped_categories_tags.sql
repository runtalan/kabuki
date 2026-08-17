-- Add household_slug column to categories and tags, making them per-household
-- instead of global. Backfill existing data to 'renato-claudia' household.

ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "household_slug" varchar(20) DEFAULT 'renato-claudia';
ALTER TABLE "tags" ADD COLUMN IF NOT EXISTS "household_slug" varchar(20) DEFAULT 'renato-claudia';

-- Make the columns NOT NULL once backfilled
UPDATE "categories" SET "household_slug" = 'renato-claudia' WHERE "household_slug" IS NULL;
UPDATE "tags" SET "household_slug" = 'renato-claudia' WHERE "household_slug" IS NULL;

ALTER TABLE "categories" ALTER COLUMN "household_slug" SET NOT NULL;
ALTER TABLE "tags" ALTER COLUMN "household_slug" SET NOT NULL;

-- Replace the old unique index on name alone with a composite unique index
-- scoped to (household_slug, name). First drop the old index by exact name
-- (verify with psql \d categories / \d tags on production beforehand).
DROP INDEX IF EXISTS "idx_categories_name";
CREATE UNIQUE INDEX IF NOT EXISTS "idx_categories_household_name"
  ON "categories" ("household_slug", "name");

DROP INDEX IF EXISTS "idx_tags_name";
CREATE UNIQUE INDEX IF NOT EXISTS "idx_tags_household_name"
  ON "tags" ("household_slug", "name");
