-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('CNIC_FRONT', 'CNIC_BACK', 'DEGREE', 'OTHER');

-- AlterTable
ALTER TABLE "tutor_profiles" ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "verificationNote" TEXT;

-- CreateTable
CREATE TABLE "verification_documents" (
    "id" TEXT NOT NULL,
    "tutorProfileId" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "storedName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "verification_documents_storedName_key" ON "verification_documents"("storedName");

-- CreateIndex
CREATE INDEX "verification_documents_tutorProfileId_idx" ON "verification_documents"("tutorProfileId");

-- AddForeignKey
ALTER TABLE "verification_documents" ADD CONSTRAINT "verification_documents_tutorProfileId_fkey" FOREIGN KEY ("tutorProfileId") REFERENCES "tutor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
