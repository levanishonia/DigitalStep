-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('low', 'medium', 'high');

-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('post', 'story', 'reel', 'campaign', 'offer');

-- Prepare existing content statuses for the new planner vocabulary.
UPDATE "ContentItem" SET "status" = 'planned' WHERE "status" = 'idea' OR "status" = 'scheduled';

-- CreateEnum
CREATE TYPE "ContentStatus_new" AS ENUM ('draft', 'planned', 'published');

-- AlterEnum for ContentStatus
ALTER TABLE "ContentItem" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "ContentItem" ALTER COLUMN "status" TYPE "ContentStatus_new" USING ("status"::text::"ContentStatus_new");
ALTER TYPE "ContentStatus" RENAME TO "ContentStatus_old";
ALTER TYPE "ContentStatus_new" RENAME TO "ContentStatus";
DROP TYPE "ContentStatus_old";
ALTER TABLE "ContentItem" ALTER COLUMN "status" SET DEFAULT 'draft';

-- AlterTable
ALTER TABLE "ContentItem" ADD COLUMN "description" TEXT,
ADD COLUMN "type" "ContentType" NOT NULL DEFAULT 'post',
ADD COLUMN "publishDate" TIMESTAMP(3);

UPDATE "ContentItem" SET "publishDate" = "scheduledFor" WHERE "publishDate" IS NULL;

ALTER TABLE "Task" ADD COLUMN "priority" "TaskPriority" NOT NULL DEFAULT 'medium';
