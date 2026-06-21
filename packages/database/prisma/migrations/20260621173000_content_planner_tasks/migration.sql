-- Make the planner migration safe to re-run after a partially applied deploy.

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TaskPriority') THEN
    CREATE TYPE "TaskPriority" AS ENUM ('low', 'medium', 'high');
  END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ContentType') THEN
    CREATE TYPE "ContentType" AS ENUM ('post', 'story', 'reel', 'campaign', 'offer');
  END IF;
END $$;

-- AlterEnum for ContentStatus, only when the old enum still needs to be converted.
DO $$
DECLARE
  current_labels text[];
  status_type_name text;
  content_status_new_in_use boolean;
BEGIN
  SELECT array_agg(e.enumlabel ORDER BY e.enumsortorder)
  INTO current_labels
  FROM pg_enum e
  JOIN pg_type t ON t.oid = e.enumtypid
  WHERE t.typname = 'ContentStatus';

  SELECT t.typname
  INTO status_type_name
  FROM pg_attribute a
  JOIN pg_class c ON c.oid = a.attrelid
  JOIN pg_type t ON t.oid = a.atttypid
  WHERE c.oid = to_regclass('"ContentItem"')
    AND a.attname = 'status'
    AND NOT a.attisdropped;

  content_status_new_in_use := status_type_name = 'ContentStatus_new';

  IF content_status_new_in_use THEN
    -- A previous run may have converted the column but stopped before renaming
    -- ContentStatus_new back to ContentStatus. Complete that transition without
    -- dropping the in-use type.
    ALTER TABLE "ContentItem" ALTER COLUMN "status" DROP DEFAULT;

    IF current_labels IS NOT NULL THEN
      ALTER TYPE "ContentStatus" RENAME TO "ContentStatus_old";
    END IF;

    ALTER TYPE "ContentStatus_new" RENAME TO "ContentStatus";
    DROP TYPE IF EXISTS "ContentStatus_old";
    ALTER TABLE "ContentItem" ALTER COLUMN "status" SET DEFAULT 'draft';
  ELSIF current_labels IS NOT NULL AND current_labels <> ARRAY['draft', 'planned', 'published'] THEN
    DROP TYPE IF EXISTS "ContentStatus_new";
    CREATE TYPE "ContentStatus_new" AS ENUM ('draft', 'planned', 'published');

    ALTER TABLE "ContentItem" ALTER COLUMN "status" DROP DEFAULT;
    ALTER TABLE "ContentItem" ALTER COLUMN "status" TYPE "ContentStatus_new"
      USING (
        CASE
          WHEN "status"::text IN ('idea', 'scheduled') THEN 'planned'
          ELSE "status"::text
        END::"ContentStatus_new"
      );
    ALTER TYPE "ContentStatus" RENAME TO "ContentStatus_old";
    ALTER TYPE "ContentStatus_new" RENAME TO "ContentStatus";
    DROP TYPE "ContentStatus_old";
    ALTER TABLE "ContentItem" ALTER COLUMN "status" SET DEFAULT 'draft';
  ELSIF current_labels IS NOT NULL THEN
    ALTER TABLE "ContentItem" ALTER COLUMN "status" SET DEFAULT 'draft';
  END IF;
END $$;

-- AlterTable
ALTER TABLE "ContentItem" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "ContentItem" ADD COLUMN IF NOT EXISTS "type" "ContentType" DEFAULT 'post';
UPDATE "ContentItem" SET "type" = 'post' WHERE "type" IS NULL;
ALTER TABLE "ContentItem" ALTER COLUMN "type" SET DEFAULT 'post';
ALTER TABLE "ContentItem" ALTER COLUMN "type" SET NOT NULL;

ALTER TABLE "ContentItem" ADD COLUMN IF NOT EXISTS "publishDate" TIMESTAMP(3);
UPDATE "ContentItem" SET "publishDate" = "scheduledFor" WHERE "publishDate" IS NULL;

ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "priority" "TaskPriority" DEFAULT 'medium';
UPDATE "Task" SET "priority" = 'medium' WHERE "priority" IS NULL;
ALTER TABLE "Task" ALTER COLUMN "priority" SET DEFAULT 'medium';
ALTER TABLE "Task" ALTER COLUMN "priority" SET NOT NULL;
