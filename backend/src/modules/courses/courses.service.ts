import type { Role } from '../../database/generated/prisma/client';
import { AppError } from '../../shared/errors/AppError';
import { notificationsService } from '../notifications/notifications.service';
import { coursesRepository } from './courses.repository';
import type {
  CourseInput,
  CourseUpdate,
  LessonInput,
  LessonUpdate,
  ListCoursesQuery,
  PageQuery,
} from './courses.schema';

type CourseRow = NonNullable<Awaited<ReturnType<typeof coursesRepository.findById>>>;

const meta = (page: number, limit: number, total: number) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
});

const toCourse = (c: CourseRow) => ({
  id: c.id,
  title: c.title,
  description: c.description,
  level: c.level,
  price: c.price,
  status: c.status,
  subject: c.subject,
  tutor: {
    id: c.tutorProfile.id,
    fullName: c.tutorProfile.user.fullName,
    headline: c.tutorProfile.headline,
    ratingAvg: c.tutorProfile.ratingAvg,
    verificationStatus: c.tutorProfile.verificationStatus,
  },
  lessonCount: c.lessons.length,
  totalDurationMin: c.lessons.reduce((sum, l) => sum + l.durationMin, 0),
  enrollmentCount: c._count.enrollments,
  lessons: c.lessons,
  createdAt: c.createdAt,
  updatedAt: c.updatedAt,
});

const progressOf = (completedIds: string[], lessonIds: string[]) => {
  const done = lessonIds.filter((id) => completedIds.includes(id)).length;
  return {
    completed: done,
    total: lessonIds.length,
    percent: lessonIds.length ? Math.round((done / lessonIds.length) * 100) : 0,
  };
};

async function requireProfile(userId: string) {
  const profileId = await coursesRepository.profileIdOf(userId);
  if (!profileId) throw AppError.badRequest('Create your tutor profile before creating courses');
  return profileId;
}

// Only admin-verified tutors may publish content; this protects students from unvetted courses.
export async function requireVerifiedTutor(profileId: string) {
  if (!(await coursesRepository.isVerified(profileId))) {
    throw AppError.forbidden(
      'Only verified tutors can do this. Upload your documents under Dashboard > Verification.',
    );
  }
}

// Only the tutor who made the course may change it.
async function requireOwned(userId: string, courseId: string) {
  const course = await coursesRepository.findOwner(courseId);
  if (!course) throw AppError.notFound('Course not found');
  if (course.tutorProfileId !== (await coursesRepository.profileIdOf(userId))) {
    throw AppError.forbidden('This is not your course');
  }
  return course;
}

async function requireSubject(subjectId: string) {
  if (!(await coursesRepository.subjectExists(subjectId))) {
    throw AppError.badRequest('Unknown subject');
  }
}

async function requirePublished(courseId: string) {
  const course = await coursesRepository.findById(courseId);
  if (!course || course.status !== 'PUBLISHED') throw AppError.notFound('Course not found');
  return course;
}

export const coursesService = {
  // ----- Tutor: manage own courses -----
  async create(userId: string, input: CourseInput) {
    const profileId = await requireProfile(userId);
    await requireVerifiedTutor(profileId);
    await requireSubject(input.subjectId);
    return toCourse(await coursesRepository.create(profileId, input));
  },

  async listMine(userId: string) {
    const profileId = await coursesRepository.profileIdOf(userId);
    if (!profileId) return [];
    return (await coursesRepository.listByTutor(profileId)).map(toCourse);
  },

  // Owner view: includes drafts and full lesson content.
  async manage(userId: string, courseId: string) {
    await requireOwned(userId, courseId);
    const course = await coursesRepository.findById(courseId);
    if (!course) throw AppError.notFound('Course not found');
    return { ...toCourse(course), lessons: await coursesRepository.lessonsWithContent(courseId) };
  },

  async update(userId: string, courseId: string, input: CourseUpdate) {
    await requireOwned(userId, courseId);
    if (input.subjectId) await requireSubject(input.subjectId);
    return toCourse(await coursesRepository.update(courseId, input));
  },

  async publish(userId: string, courseId: string) {
    const owned = await requireOwned(userId, courseId);
    await requireVerifiedTutor(owned.tutorProfileId);
    const course = await coursesRepository.findById(courseId);
    if (!course || course.lessons.length === 0) {
      throw AppError.badRequest('Add at least one lesson before publishing');
    }
    return toCourse(await coursesRepository.setStatus(courseId, 'PUBLISHED'));
  },

  async unpublish(userId: string, courseId: string) {
    await requireOwned(userId, courseId);
    return toCourse(await coursesRepository.setStatus(courseId, 'DRAFT'));
  },

  // Deleting a course with students would silently destroy their progress.
  async remove(userId: string, courseId: string) {
    await requireOwned(userId, courseId);
    if ((await coursesRepository.countEnrollments(courseId)) > 0) {
      throw AppError.conflict('Students are enrolled; unpublish the course instead of deleting it');
    }
    await coursesRepository.remove(courseId);
  },

  async addLesson(userId: string, courseId: string, input: LessonInput) {
    await requireOwned(userId, courseId);
    return coursesRepository.addLesson(courseId, input);
  },

  async updateLesson(userId: string, courseId: string, lessonId: string, input: LessonUpdate) {
    await requireOwned(userId, courseId);
    if (!(await coursesRepository.findLesson(courseId, lessonId))) {
      throw AppError.notFound('Lesson not found');
    }
    return coursesRepository.updateLesson(lessonId, input);
  },

  async deleteLesson(userId: string, courseId: string, lessonId: string) {
    const course = await requireOwned(userId, courseId);
    if (!(await coursesRepository.findLesson(courseId, lessonId))) {
      throw AppError.notFound('Lesson not found');
    }
    const remaining = (await coursesRepository.findById(courseId))?.lessons.length ?? 0;
    // A published course must never end up empty.
    if (course.status === 'PUBLISHED' && remaining <= 1) {
      throw AppError.conflict('Unpublish the course before deleting its last lesson');
    }
    await coursesRepository.deleteLesson(lessonId);
  },

  // ----- Public catalogue -----
  async list(query: ListCoursesQuery) {
    const { items, total } = await coursesRepository.listPublished(query);
    return { items: items.map(toCourse), meta: meta(query.page, query.limit, total) };
  },

  async getPublic(courseId: string) {
    return toCourse(await requirePublished(courseId));
  },

  // ----- Students -----
  async enroll(studentId: string, courseId: string) {
    const course = await requirePublished(courseId);
    if (await coursesRepository.findEnrollment(courseId, studentId)) {
      throw AppError.conflict('You are already enrolled in this course');
    }
    try {
      await coursesRepository.createEnrollment(courseId, studentId);
    } catch (err) {
      // Two simultaneous clicks: the unique index rejects the second one.
      if ((err as { code?: string }).code === 'P2002') {
        throw AppError.conflict('You are already enrolled in this course');
      }
      throw err;
    }
    const tutorUserId = await coursesRepository.tutorUserId(course.tutorProfile.id);
    if (tutorUserId) {
      await notificationsService.notify({
        userId: tutorUserId,
        type: 'COURSE_ENROLLED',
        title: 'New enrollment',
        body: `A student enrolled in "${course.title}".`,
        data: { courseId },
      });
    }
    return this.enrollmentState(studentId, courseId);
  },

  async unenroll(studentId: string, courseId: string) {
    if ((await coursesRepository.deleteEnrollment(courseId, studentId)) === 0) {
      throw AppError.notFound('You are not enrolled in this course');
    }
  },

  async myEnrollments(studentId: string, { page, limit }: PageQuery) {
    const { items, total } = await coursesRepository.listEnrollments(studentId, page, limit);
    return {
      items: items.map((e) => ({
        enrolledAt: e.createdAt,
        course: toCourse(e.course),
        progress: progressOf(
          e.progress.map((p) => p.lessonId),
          e.course.lessons.map((l) => l.id),
        ),
      })),
      meta: meta(page, limit, total),
    };
  },

  async enrollmentState(studentId: string, courseId: string) {
    const course = await coursesRepository.findById(courseId);
    if (!course) throw AppError.notFound('Course not found');
    const enrollment = await coursesRepository.findEnrollment(courseId, studentId);
    if (!enrollment) return { enrolled: false as const };
    const completedLessonIds = enrollment.progress.map((p) => p.lessonId);
    return {
      enrolled: true as const,
      enrolledAt: enrollment.createdAt,
      completedLessonIds,
      progress: progressOf(
        completedLessonIds,
        course.lessons.map((l) => l.id),
      ),
    };
  },

  // The lesson text is the paid-for part: only the owner, enrolled students and admins read it.
  async getLesson(user: { id: string; role: Role }, courseId: string, lessonId: string) {
    const course = await coursesRepository.findOwner(courseId);
    if (!course) throw AppError.notFound('Course not found');
    const lesson = await coursesRepository.findLesson(courseId, lessonId);
    if (!lesson) throw AppError.notFound('Lesson not found');

    const isOwner = course.tutorProfileId === (await coursesRepository.profileIdOf(user.id));
    const enrolled = !!(await coursesRepository.findEnrollment(courseId, user.id));
    if (!isOwner && !enrolled && user.role !== 'ADMIN') {
      throw AppError.forbidden('Enroll in this course to open its lessons');
    }
    return lesson;
  },

  async setLessonDone(studentId: string, courseId: string, lessonId: string, done: boolean) {
    const enrollment = await coursesRepository.findEnrollment(courseId, studentId);
    if (!enrollment) throw AppError.forbidden('Enroll in this course first');
    if (!(await coursesRepository.findLesson(courseId, lessonId))) {
      throw AppError.notFound('Lesson not found');
    }
    if (done) await coursesRepository.markComplete(enrollment.id, lessonId);
    else await coursesRepository.unmarkComplete(enrollment.id, lessonId);
    return this.enrollmentState(studentId, courseId);
  },
};
