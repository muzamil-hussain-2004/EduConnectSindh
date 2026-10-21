import { prisma } from '../../config/database';
import type { Prisma } from '../../database/generated/prisma/client';

const include = {
  user: { select: { fullName: true } },
  subjects: { select: { id: true, name: true }, orderBy: { name: 'asc' } },
  areas: { select: { id: true, name: true }, orderBy: { name: 'asc' } },
} satisfies Prisma.TutorProfileInclude;

export type TutorProfileWithRelations = Prisma.TutorProfileGetPayload<{ include: typeof include }>;

export const tutorsRepository = {
  findByUserId: (userId: string) => prisma.tutorProfile.findUnique({ where: { userId }, include }),

  findById: (id: string) => prisma.tutorProfile.findUnique({ where: { id }, include }),

  countSubjects: (ids: string[]) => prisma.subject.count({ where: { id: { in: ids } } }),

  countAreas: (ids: string[]) => prisma.area.count({ where: { id: { in: ids } } }),

  // `set` replaces the whole relation, so removed subjects/areas are unlinked.
  upsert: (
    userId: string,
    data: Omit<Prisma.TutorProfileUncheckedCreateInput, 'userId' | 'subjects' | 'areas'>,
    subjectIds: string[],
    areaIds: string[],
  ) =>
    prisma.tutorProfile.upsert({
      where: { userId },
      create: {
        ...data,
        userId,
        subjects: { connect: subjectIds.map((id) => ({ id })) },
        areas: { connect: areaIds.map((id) => ({ id })) },
      },
      update: {
        ...data,
        subjects: { set: subjectIds.map((id) => ({ id })) },
        areas: { set: areaIds.map((id) => ({ id })) },
      },
      include,
    }),
};
