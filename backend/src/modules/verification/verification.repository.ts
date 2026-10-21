import { prisma } from '../../config/database';
import type { DocumentType, VerificationStatus } from '../../database/generated/prisma/client';
import type { ListRequestsQuery } from './verification.schema';

export const verificationRepository = {
  findProfileByUserId: (userId: string) =>
    prisma.tutorProfile.findUnique({
      where: { userId },
      include: { documents: { orderBy: { createdAt: 'asc' } } },
    }),

  findProfileById: (id: string) =>
    prisma.tutorProfile.findUnique({
      where: { id },
      include: {
        user: { select: { fullName: true } },
        documents: { orderBy: { createdAt: 'asc' } },
      },
    }),

  findDocument: (id: string) =>
    prisma.verificationDocument.findUnique({
      where: { id },
      include: { tutorProfile: { select: { userId: true, verificationStatus: true } } },
    }),

  createDocument: (data: {
    tutorProfileId: string;
    type: DocumentType;
    storedName: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
  }) => prisma.verificationDocument.create({ data }),

  deleteDocument: (id: string) => prisma.verificationDocument.delete({ where: { id } }),

  // The status is part of the WHERE clause, so two admins cannot both decide the same request.
  // Returns how many rows changed (0 = already decided or not pending).
  async decide(id: string, from: VerificationStatus, to: VerificationStatus, note: string | null) {
    const result = await prisma.tutorProfile.updateMany({
      where: { id, verificationStatus: from },
      data: { verificationStatus: to, verificationNote: note, reviewedAt: new Date() },
    });
    return result.count;
  },

  async submit(id: string) {
    const result = await prisma.tutorProfile.updateMany({
      where: { id, verificationStatus: { in: ['UNVERIFIED', 'REJECTED'] } },
      data: { verificationStatus: 'PENDING', verificationNote: null, reviewedAt: null },
    });
    return result.count;
  },

  async listByStatus(query: ListRequestsQuery) {
    const where = { verificationStatus: query.status };
    const [items, total] = await prisma.$transaction([
      prisma.tutorProfile.findMany({
        where,
        orderBy: { updatedAt: 'asc' }, // oldest first: first come, first served
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        select: {
          id: true,
          headline: true,
          verificationStatus: true,
          verificationNote: true,
          reviewedAt: true,
          updatedAt: true,
          user: { select: { fullName: true } },
          _count: { select: { documents: true } },
        },
      }),
      prisma.tutorProfile.count({ where }),
    ]);
    return { items, total };
  },
};
