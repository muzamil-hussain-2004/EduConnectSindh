import { prisma } from '../../config/database';
import type { Prisma } from '../../database/generated/prisma/client';
import { AppError } from '../../shared/errors/AppError';
import type { ClassInput, ClassUpdate, ListClassesQuery } from './classes.schema';

const classSelect = {
  id: true,
  title: true,
  description: true,
  startsAt: true,
  durationMin: true,
  capacity: true,
  status: true,
  meetingUrl: true,
  tutorProfileId: true,
  course: { select: { id: true, title: true } },
  tutorProfile: { select: { id: true, user: { select: { fullName: true } } } },
  _count: { select: { bookings: true } },
} satisfies Prisma.ClassSessionSelect;

export const classesRepository = {
  create: (tutorProfileId: string, input: ClassInput) =>
    prisma.classSession.create({
      data: {
        tutorProfileId,
        title: input.title,
        description: input.description,
        startsAt: input.startsAt,
        durationMin: input.durationMin,
        meetingUrl: input.meetingUrl,
        capacity: input.capacity,
        courseId: input.courseId ?? null,
      },
      select: classSelect,
    }),

  findById: (id: string) => prisma.classSession.findUnique({ where: { id }, select: classSelect }),

  update: (id: string, input: ClassUpdate) =>
    prisma.classSession.update({
      where: { id },
      data: {
        ...input,
        courseId: input.courseId === undefined ? undefined : input.courseId,
      },
      select: classSelect,
    }),

  cancel: (id: string) =>
    prisma.classSession.update({
      where: { id },
      data: { status: 'CANCELLED' },
      select: classSelect,
    }),

  async listUpcoming({ courseId, tutorId, page, limit }: ListClassesQuery) {
    const where: Prisma.ClassSessionWhereInput = {
      status: 'SCHEDULED',
      startsAt: { gt: new Date() },
      ...(courseId && { courseId }),
      ...(tutorId && { tutorProfileId: tutorId }),
    };
    const [items, total] = await prisma.$transaction([
      prisma.classSession.findMany({
        where,
        select: classSelect,
        orderBy: { startsAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.classSession.count({ where }),
    ]);
    return { items, total };
  },

  listByTutor: (tutorProfileId: string) =>
    prisma.classSession.findMany({
      where: { tutorProfileId },
      select: classSelect,
      orderBy: { startsAt: 'desc' },
      take: 100,
    }),

  listBookedBy: (studentId: string) =>
    prisma.classBooking.findMany({
      where: { studentId, session: { status: 'SCHEDULED', startsAt: { gt: new Date() } } },
      select: { session: { select: classSelect } },
      orderBy: { session: { startsAt: 'asc' } },
      take: 100,
    }),

  findBooking: (sessionId: string, studentId: string) =>
    prisma.classBooking.findUnique({ where: { sessionId_studentId: { sessionId, studentId } } }),

  bookedStudentIds: async (sessionId: string) =>
    (await prisma.classBooking.findMany({ where: { sessionId }, select: { studentId: true } })).map(
      (b) => b.studentId,
    ),

  enrolledStudentIds: async (courseId: string) =>
    (await prisma.enrollment.findMany({ where: { courseId }, select: { studentId: true } })).map(
      (e) => e.studentId,
    ),

  // The row lock makes "check capacity, then insert" atomic, so two students
  // clicking at the same time cannot both take the last seat.
  book: (sessionId: string, studentId: string, capacity: number) =>
    prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM class_sessions WHERE id = ${sessionId} FOR UPDATE`;
      if ((await tx.classBooking.count({ where: { sessionId } })) >= capacity) {
        throw AppError.conflict('This class is full');
      }
      return tx.classBooking.create({ data: { sessionId, studentId } });
    }),

  unbook: async (sessionId: string, studentId: string) =>
    (await prisma.classBooking.deleteMany({ where: { sessionId, studentId } })).count,
};
