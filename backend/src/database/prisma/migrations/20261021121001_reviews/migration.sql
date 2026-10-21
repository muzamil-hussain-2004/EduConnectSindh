-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('VISIBLE', 'HIDDEN');

-- AlterTable
ALTER TABLE "tutor_profiles" ADD COLUMN     "ratingAvg" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "ratingCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "tutorProfileId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'VISIBLE',
    "moderationNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reviews_tutorProfileId_status_createdAt_idx" ON "reviews"("tutorProfileId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_authorId_tutorProfileId_key" ON "reviews"("authorId", "tutorProfileId");

-- CreateIndex
CREATE INDEX "tutor_profiles_ratingAvg_idx" ON "tutor_profiles"("ratingAvg");

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_tutorProfileId_fkey" FOREIGN KEY ("tutorProfileId") REFERENCES "tutor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
