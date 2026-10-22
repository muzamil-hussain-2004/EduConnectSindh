import { prisma } from '../../config/database';

const tutorSummarySelect = {
  id: true,
  headline: true,
  qualification: true,
  experienceYears: true,
  hourlyRate: true,
  teachingMode: true,
  verificationStatus: true,
  user: { select: { id: true, fullName: true, avatarFile: true } },
  subjects: { select: { id: true, name: true }, orderBy: { name: 'asc' } },
  areas: { select: { id: true, name: true }, orderBy: { name: 'asc' } },
} as const;

export const shortlistRepository = {
  findTutor: (tutorProfileId: string) =>
    prisma.tutorProfile.findUnique({
      where: { id: tutorProfileId },
      select: { id: true, isPublished: true, user: { select: { status: true } } },
    }),

  // upsert makes "save" idempotent: saving twice (or two parallel clicks) is not an error.
  add: (studentId: string, tutorProfileId: string) =>
    prisma.shortlistItem.upsert({
      where: { studentId_tutorProfileId: { studentId, tutorProfileId } },
      create: { studentId, tutorProfileId },
      update: {},
    }),

  remove: (studentId: string, tutorProfileId: string) =>
    prisma.shortlistItem.deleteMany({ where: { studentId, tutorProfileId } }),

  // Tutors that were unpublished or suspended since being saved are hidden.
  list: (studentId: string) =>
    prisma.shortlistItem.findMany({
      where: {
        studentId,
        tutorProfile: { isPublished: true, user: { status: 'ACTIVE' } },
      },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true, tutorProfile: { select: tutorSummarySelect } },
    }),
};
