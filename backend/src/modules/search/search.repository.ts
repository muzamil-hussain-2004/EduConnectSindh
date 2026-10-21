import { prisma } from '../../config/database';
import type { Prisma } from '../../database/generated/prisma/client';
import type { SearchTutorsQuery } from './search.schema';

const orderBy: Record<SearchTutorsQuery['sort'], Prisma.TutorProfileOrderByWithRelationInput[]> = {
  newest: [{ createdAt: 'desc' }, { id: 'asc' }],
  priceAsc: [{ hourlyRate: 'asc' }, { id: 'asc' }],
  priceDesc: [{ hourlyRate: 'desc' }, { id: 'asc' }],
  experience: [{ experienceYears: 'desc' }, { id: 'asc' }],
};

function buildWhere(q: SearchTutorsQuery): Prisma.TutorProfileWhereInput {
  const rate: Prisma.IntFilter = {};
  if (q.minRate !== undefined) rate.gte = q.minRate;
  if (q.maxRate !== undefined) rate.lte = q.maxRate;

  return {
    // Only published tutors whose account is active are ever searchable.
    isPublished: true,
    user: { status: 'ACTIVE' },
    ...(q.verifiedOnly ? { verificationStatus: 'VERIFIED' } : {}),
    ...(q.mode ? { teachingMode: { in: [q.mode, 'BOTH'] } } : {}),
    ...(Object.keys(rate).length > 0 ? { hourlyRate: rate } : {}),
    ...(q.minExperience !== undefined ? { experienceYears: { gte: q.minExperience } } : {}),
    ...(q.subjectId ? { subjects: { some: { id: q.subjectId } } } : {}),
    ...(q.areaId ? { areas: { some: { id: q.areaId } } } : {}),
    ...(q.q
      ? {
          OR: [
            { headline: { contains: q.q, mode: 'insensitive' } },
            { bio: { contains: q.q, mode: 'insensitive' } },
            { user: { fullName: { contains: q.q, mode: 'insensitive' } } },
            { subjects: { some: { name: { contains: q.q, mode: 'insensitive' } } } },
          ],
        }
      : {}),
  };
}

export const searchRepository = {
  async searchTutors(q: SearchTutorsQuery) {
    const where = buildWhere(q);
    const [items, total] = await prisma.$transaction([
      prisma.tutorProfile.findMany({
        where,
        orderBy: orderBy[q.sort],
        skip: (q.page - 1) * q.limit,
        take: q.limit,
        select: {
          id: true,
          headline: true,
          qualification: true,
          experienceYears: true,
          hourlyRate: true,
          teachingMode: true,
          verificationStatus: true,
          user: { select: { fullName: true } },
          subjects: { select: { id: true, name: true }, orderBy: { name: 'asc' } },
          areas: { select: { id: true, name: true }, orderBy: { name: 'asc' } },
        },
      }),
      prisma.tutorProfile.count({ where }),
    ]);
    return { items, total };
  },
};
