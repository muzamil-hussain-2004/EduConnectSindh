import { prisma } from '../../config/database';
import type { Prisma, ReviewStatus } from '../../database/generated/prisma/client';
import type { ReviewInput } from './reviews.schema';

const select = {
  id: true,
  tutorProfileId: true,
  rating: true,
  comment: true,
  status: true,
  moderationNote: true,
  createdAt: true,
  updatedAt: true,
  author: { select: { fullName: true } },
} satisfies Prisma.ReviewSelect;

type Tx = Prisma.TransactionClient;

// Rebuild the tutor's cached rating from the reviews that are currently visible.
async function refreshRating(tx: Tx, tutorProfileId: string) {
  const agg = await tx.review.aggregate({
    where: { tutorProfileId, status: 'VISIBLE' },
    _avg: { rating: true },
    _count: { _all: true },
  });
  await tx.tutorProfile.update({
    where: { id: tutorProfileId },
    data: {
      ratingAvg: Math.round((agg._avg.rating ?? 0) * 10) / 10,
      ratingCount: agg._count._all,
    },
  });
}

export const reviewsRepository = {
  findTutor: (id: string) =>
    prisma.tutorProfile.findUnique({
      where: { id },
      select: { id: true, isPublished: true, userId: true, user: { select: { status: true } } },
    }),

  hasAcceptedRequest: async (studentId: string, tutorProfileId: string) =>
    (await prisma.tutorRequest.count({
      where: { studentId, tutorProfileId, status: 'ACCEPTED' },
    })) > 0,

  findMine: (authorId: string, tutorProfileId: string) =>
    prisma.review.findUnique({
      where: { authorId_tutorProfileId: { authorId, tutorProfileId } },
      select: { id: true },
    }),

  // Editing never changes the moderation status, so an admin's hide cannot be undone by the author.
  upsert: (authorId: string, tutorProfileId: string, input: ReviewInput) =>
    prisma.$transaction(async (tx) => {
      const review = await tx.review.upsert({
        where: { authorId_tutorProfileId: { authorId, tutorProfileId } },
        create: { authorId, tutorProfileId, ...input },
        update: input,
        select,
      });
      await refreshRating(tx, tutorProfileId);
      return review;
    }),

  deleteMine: (authorId: string, tutorProfileId: string) =>
    prisma.$transaction(async (tx) => {
      const { count } = await tx.review.deleteMany({ where: { authorId, tutorProfileId } });
      if (count > 0) await refreshRating(tx, tutorProfileId);
      return count;
    }),

  listVisible: async (tutorProfileId: string, page: number, limit: number) => {
    const where = { tutorProfileId, status: 'VISIBLE' as const };
    const [items, total] = await prisma.$transaction([
      prisma.review.findMany({
        where,
        select,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.review.count({ where }),
    ]);
    return { items, total };
  },

  listAll: async (status: ReviewStatus | undefined, page: number, limit: number) => {
    const where = status ? { status } : {};
    const [items, total] = await prisma.$transaction([
      prisma.review.findMany({
        where,
        select,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.review.count({ where }),
    ]);
    return { items, total };
  },

  moderate: (id: string, status: ReviewStatus, note: string | null) =>
    prisma.$transaction(async (tx) => {
      const existing = await tx.review.findUnique({ where: { id }, select: { id: true } });
      if (!existing) return null;
      const review = await tx.review.update({
        where: { id },
        data: { status, moderationNote: status === 'HIDDEN' ? note : null },
        select,
      });
      await refreshRating(tx, review.tutorProfileId);
      return review;
    }),
};
