import { prisma } from '../../config/database';
import type { CourseStatus, Prisma } from '../../database/generated/prisma/client';
import type {
  CourseInput,
  CourseUpdate,
  LessonInput,
  LessonUpdate,
  ListCoursesQuery,
} from './courses.schema';

const lessonOrder = [
  { position: 'asc' },
  { createdAt: 'asc' },
] satisfies Prisma.LessonOrderByWithRelationInput[];

// Outline only: lesson content is never part of a course listing.
const courseSelect = {
  id: true,
  title: true,
  description: true,
  level: true,
  price: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  subject: { select: { id: true, name: true } },
  tutorProfile: {
    select: {
      id: true,
      headline: true,
      ratingAvg: true,
      verificationStatus: true,
      user: { select: { fullName: true } },
    },
  },
  lessons: {
    select: { id: true, title: true, durationMin: true, position: true },
    orderBy: lessonOrder,
  },
  _count: { select: { enrollments: true } },
} satisfies Prisma.CourseSelect;

const lessonSelect = {
  id: true,
  courseId: true,
  title: true,
  content: true,
  videoUrl: true,
  durationMin: true,
  position: true,
} satisfies Prisma.LessonSelect;

const orderings: Record<ListCoursesQuery['sort'], Prisma.CourseOrderByWithRelationInput[]> = {
  newest: [{ createdAt: 'desc' }, { id: 'asc' }],
  popular: [{ enrollments: { _count: 'desc' } }, { createdAt: 'desc' }, { id: 'asc' }],
  priceAsc: [{ price: 'asc' }, { id: 'asc' }],
  priceDesc: [{ price: 'desc' }, { id: 'asc' }],
};

export const coursesRepository = {
  profileIdOf: async (userId: string) =>
    (await prisma.tutorProfile.findUnique({ where: { userId }, select: { id: true } }))?.id ?? null,

  isVerified: async (id: string) =>
    (await prisma.tutorProfile.count({ where: { id, verificationStatus: 'VERIFIED' } })) > 0,

  subjectExists: async (id: string) => (await prisma.subject.count({ where: { id } })) > 0,

  tutorUserId: async (tutorProfileId: string) =>
    (
      await prisma.tutorProfile.findUnique({
        where: { id: tutorProfileId },
        select: { userId: true },
      })
    )?.userId ?? null,

  create: (tutorProfileId: string, input: CourseInput) =>
    prisma.course.create({ data: { tutorProfileId, ...input }, select: courseSelect }),

  findById: (id: string) => prisma.course.findUnique({ where: { id }, select: courseSelect }),

  // Used for ownership checks without loading the whole course.
  findOwner: (id: string) =>
    prisma.course.findUnique({
      where: { id },
      select: { id: true, status: true, tutorProfileId: true, title: true },
    }),

  update: (id: string, data: CourseUpdate) =>
    prisma.course.update({ where: { id }, data, select: courseSelect }),

  setStatus: (id: string, status: CourseStatus) =>
    prisma.course.update({ where: { id }, data: { status }, select: courseSelect }),

  remove: (id: string) => prisma.course.delete({ where: { id } }),

  countEnrollments: (courseId: string) => prisma.enrollment.count({ where: { courseId } }),

  listPublished: async (q: ListCoursesQuery) => {
    const where: Prisma.CourseWhereInput = {
      status: 'PUBLISHED',
      tutorProfile: { user: { status: 'ACTIVE' } },
      ...(q.subjectId && { subjectId: q.subjectId }),
      ...(q.level && { level: q.level }),
      ...(q.freeOnly === 'true'
        ? { price: 0 }
        : q.maxPrice !== undefined && { price: { lte: q.maxPrice } }),
      ...(q.q && {
        OR: [
          { title: { contains: q.q, mode: 'insensitive' } },
          { description: { contains: q.q, mode: 'insensitive' } },
        ],
      }),
    };
    const [items, total] = await prisma.$transaction([
      prisma.course.findMany({
        where,
        select: courseSelect,
        orderBy: orderings[q.sort],
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
      prisma.course.count({ where }),
    ]);
    return { items, total };
  },

  listByTutor: (tutorProfileId: string) =>
    prisma.course.findMany({
      where: { tutorProfileId },
      select: courseSelect,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    }),

  // Lessons
  lessonsWithContent: (courseId: string) =>
    prisma.lesson.findMany({ where: { courseId }, select: lessonSelect, orderBy: lessonOrder }),

  findLesson: (courseId: string, lessonId: string) =>
    prisma.lesson.findFirst({ where: { id: lessonId, courseId }, select: lessonSelect }),

  // Appends after the last lesson; the transaction keeps two parallel adds from sharing a position.
  addLesson: (courseId: string, input: LessonInput) =>
    prisma.$transaction(async (tx) => {
      const last = await tx.lesson.aggregate({ where: { courseId }, _max: { position: true } });
      return tx.lesson.create({
        data: { courseId, ...input, position: (last._max.position ?? 0) + 1 },
        select: lessonSelect,
      });
    }),

  updateLesson: (lessonId: string, data: LessonUpdate) =>
    prisma.lesson.update({ where: { id: lessonId }, data, select: lessonSelect }),

  deleteLesson: (lessonId: string) => prisma.lesson.delete({ where: { id: lessonId } }),

  // Enrollment and progress
  findEnrollment: (courseId: string, studentId: string) =>
    prisma.enrollment.findUnique({
      where: { courseId_studentId: { courseId, studentId } },
      select: { id: true, createdAt: true, progress: { select: { lessonId: true } } },
    }),

  createEnrollment: (courseId: string, studentId: string) =>
    prisma.enrollment.create({ data: { courseId, studentId }, select: { id: true } }),

  deleteEnrollment: async (courseId: string, studentId: string) =>
    (await prisma.enrollment.deleteMany({ where: { courseId, studentId } })).count,

  listEnrollments: async (studentId: string, page: number, limit: number) => {
    const where = { studentId };
    const [items, total] = await prisma.$transaction([
      prisma.enrollment.findMany({
        where,
        select: {
          createdAt: true,
          progress: { select: { lessonId: true } },
          course: { select: courseSelect },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.enrollment.count({ where }),
    ]);
    return { items, total };
  },

  markComplete: (enrollmentId: string, lessonId: string) =>
    prisma.lessonProgress.upsert({
      where: { enrollmentId_lessonId: { enrollmentId, lessonId } },
      create: { enrollmentId, lessonId },
      update: {},
      select: { id: true },
    }),

  unmarkComplete: (enrollmentId: string, lessonId: string) =>
    prisma.lessonProgress.deleteMany({ where: { enrollmentId, lessonId } }),
};
