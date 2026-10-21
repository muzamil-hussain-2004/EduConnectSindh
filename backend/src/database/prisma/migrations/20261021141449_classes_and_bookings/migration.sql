-- CreateEnum
CREATE TYPE "ClassStatus" AS ENUM ('SCHEDULED', 'CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'CLASS_SCHEDULED';
ALTER TYPE "NotificationType" ADD VALUE 'CLASS_CANCELLED';

-- CreateTable
CREATE TABLE "class_sessions" (
    "id" TEXT NOT NULL,
    "tutorProfileId" TEXT NOT NULL,
    "courseId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "durationMin" INTEGER NOT NULL DEFAULT 60,
    "meetingUrl" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 30,
    "status" "ClassStatus" NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "class_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_bookings" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "class_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "class_sessions_status_startsAt_idx" ON "class_sessions"("status", "startsAt");

-- CreateIndex
CREATE INDEX "class_sessions_tutorProfileId_startsAt_idx" ON "class_sessions"("tutorProfileId", "startsAt");

-- CreateIndex
CREATE INDEX "class_bookings_studentId_idx" ON "class_bookings"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "class_bookings_sessionId_studentId_key" ON "class_bookings"("sessionId", "studentId");

-- AddForeignKey
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_tutorProfileId_fkey" FOREIGN KEY ("tutorProfileId") REFERENCES "tutor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_bookings" ADD CONSTRAINT "class_bookings_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "class_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_bookings" ADD CONSTRAINT "class_bookings_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
