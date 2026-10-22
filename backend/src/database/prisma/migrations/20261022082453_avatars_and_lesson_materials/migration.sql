-- AlterTable
ALTER TABLE "users" ADD COLUMN     "avatarFile" TEXT;

-- CreateTable
CREATE TABLE "lesson_materials" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "extractedText" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lesson_materials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lesson_materials_storedName_key" ON "lesson_materials"("storedName");

-- CreateIndex
CREATE INDEX "lesson_materials_lessonId_idx" ON "lesson_materials"("lessonId");

-- AddForeignKey
ALTER TABLE "lesson_materials" ADD CONSTRAINT "lesson_materials_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
