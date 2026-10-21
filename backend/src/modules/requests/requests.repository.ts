import { prisma } from '../../config/database';
import type { Prisma, RequestStatus } from '../../database/generated/prisma/client';
import type { CreateRequestInput, ListRequestsQuery } from './requests.schema';

const include = {
  subject: { select: { id: true, name: true } },
  area: { select: { id: true, name: true } },
  student: { select: { fullName: true, email: true, phone: true } },
  tutorProfile: {
    select: {
      id: true,
      userId: true,
      user: { select: { fullName: true, email: true, phone: true } },
    },
  },
} satisfies Prisma.TutorRequestInclude;

export type RequestWithRelations = Prisma.TutorRequestGetPayload<{ include: typeof include }>;

export const requestsRepository = {
  findTutor: (id: string) =>
    prisma.tutorProfile.findUnique({
      where: { id },
      select: {
        id: true,
        isPublished: true,
        userId: true,
        teachingMode: true,
        user: { select: { status: true } },
        subjects: { select: { id: true } },
        areas: { select: { id: true } },
      },
    }),

  areaExists: async (id: string) => (await prisma.area.count({ where: { id } })) > 0,

  findById: (id: string) => prisma.tutorRequest.findUnique({ where: { id }, include }),

  countPendingByStudent: (studentId: string) =>
    prisma.tutorRequest.count({ where: { studentId, status: 'PENDING' } }),

  hasPending: async (studentId: string, tutorProfileId: string, subjectId: string) =>
    (await prisma.tutorRequest.count({
      where: { studentId, tutorProfileId, subjectId, status: 'PENDING' },
    })) > 0,

  create: (studentId: string, input: Omit<CreateRequestInput, 'tutorId'>, tutorProfileId: string) =>
    prisma.tutorRequest.create({
      data: {
        studentId,
        tutorProfileId,
        subjectId: input.subjectId,
        areaId: input.areaId ?? null,
        mode: input.mode,
        budgetPerHour: input.budgetPerHour ?? null,
        message: input.message,
      },
      include,
    }),

  async list(where: Prisma.TutorRequestWhereInput, query: ListRequestsQuery) {
    const [items, total] = await prisma.$transaction([
      prisma.tutorRequest.findMany({
        where,
        include,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.tutorRequest.count({ where }),
    ]);
    return { items, total };
  },

  // `status: PENDING` in the WHERE means only one of two racing decisions can win.
  // Returns the number of changed rows (0 = no longer pending).
  async transition(id: string, to: RequestStatus, responseNote: string | null) {
    const result = await prisma.tutorRequest.updateMany({
      where: { id, status: 'PENDING' },
      data: { status: to, responseNote, respondedAt: new Date() },
    });
    return result.count;
  },
};
