CREATE TABLE "StudioGeneration" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudioGeneration_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StudioGeneration_userId_createdAt_idx" ON "StudioGeneration"("userId", "createdAt");
CREATE INDEX "StudioGeneration_businessId_createdAt_idx" ON "StudioGeneration"("businessId", "createdAt");

ALTER TABLE "StudioGeneration" ADD CONSTRAINT "StudioGeneration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudioGeneration" ADD CONSTRAINT "StudioGeneration_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
