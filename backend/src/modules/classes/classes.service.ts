import type { Role } from '../../database/generated/prisma/client';
import { AppError } from '../../shared/errors/AppError';
import { coursesRepository } from '../courses/courses.repository';
import { requireVerifiedTutor } from '../courses/courses.service';
import { notificationsService } from '../notifications/notifications.service';
import { classesRepository } from './classes.repository';
import type { ClassInput, ClassUpdate, ListClassesQuery } from './classes.schema';

type ClassRow = NonNullable<Awaited<ReturnType<typeof classesRepository.findById>>>;

// The meeting link is deliberately left out; see getJoinLink().
const toClass = ({ meetingUrl: _link, tutorProfile, _count, ...c }: ClassRow) => ({
  ...c,
  tutor: { id: tutorProfile.id, fullName: tutorProfile.user.fullName },
  bookingCount: _count.bookings,
  seatsLeft: Math.max(c.capacity - _count.bookings, 0),
});

const fmt = (d: Date) =>
  d.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Karachi' });

async function requireOwned(userId: string, classId: string) {
  const session = await classesRepository.findById(classId);
  if (!session) throw AppError.notFound('Class not found');
  if (session.tutorProfileId !== (await coursesRepository.profileIdOf(userId))) {
    throw AppError.forbidden('This is not your class');
  }
  return session;
}

async function requireOwnCourse(userId: string, courseId?: string | null) {
  if (!courseId) return;
  const course = await coursesRepository.findOwner(courseId);
  if (!course) throw AppError.badRequest('Unknown course');
  if (course.tutorProfileId !== (await coursesRepository.profileIdOf(userId))) {
    throw AppError.forbidden('You can only link your own courses');
  }
}

const requireFuture = (d: Date) => {
  if (d.getTime() <= Date.now()) throw AppError.badRequest('Start time must be in the future');
};

async function notifyMany(
  userIds: string[],
  type: 'CLASS_SCHEDULED' | 'CLASS_CANCELLED',
  title: string,
  body: string,
  classId: string,
) {
  await Promise.all(
    userIds.map((userId) =>
      notificationsService.notify({ userId, type, title, body, data: { classId } }),
    ),
  );
}

export const classesService = {
  async create(userId: string, input: ClassInput) {
    const profileId = await coursesRepository.profileIdOf(userId);
    if (!profileId)
      throw AppError.badRequest('Create your tutor profile before scheduling classes');
    await requireVerifiedTutor(profileId);
    requireFuture(input.startsAt);
    await requireOwnCourse(userId, input.courseId);
    const session = await classesRepository.create(profileId, input);

    if (session.course) {
      await notifyMany(
        await classesRepository.enrolledStudentIds(session.course.id),
        'CLASS_SCHEDULED',
        'New live class scheduled',
        `"${session.title}" starts ${fmt(session.startsAt)}.`,
        session.id,
      );
    }
    return toClass(session);
  },

  async listMine(userId: string) {
    const profileId = await coursesRepository.profileIdOf(userId);
    if (!profileId) return [];
    return (await classesRepository.listByTutor(profileId)).map(toClass);
  },

  async listUpcoming(query: ListClassesQuery) {
    const { items, total } = await classesRepository.listUpcoming(query);
    return {
      items: items.map(toClass),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  },

  async listBooked(studentId: string) {
    return (await classesRepository.listBookedBy(studentId)).map((b) => toClass(b.session));
  },

  async get(id: string) {
    const session = await classesRepository.findById(id);
    if (!session) throw AppError.notFound('Class not found');
    return toClass(session);
  },

  async update(userId: string, id: string, input: ClassUpdate) {
    const current = await requireOwned(userId, id);
    if (current.status !== 'SCHEDULED')
      throw AppError.conflict('A cancelled class cannot be edited');
    if (current.startsAt.getTime() <= Date.now())
      throw AppError.conflict('This class already started');
    if (input.startsAt) requireFuture(input.startsAt);
    if (input.courseId) await requireOwnCourse(userId, input.courseId);
    if (input.capacity !== undefined && input.capacity < current._count.bookings) {
      throw AppError.badRequest('Capacity cannot be lower than the seats already booked');
    }
    const updated = await classesRepository.update(id, input);

    const changed =
      (input.startsAt && input.startsAt.getTime() !== current.startsAt.getTime()) ||
      (input.meetingUrl && input.meetingUrl !== current.meetingUrl);
    if (changed) {
      await notifyMany(
        await classesRepository.bookedStudentIds(id),
        'CLASS_SCHEDULED',
        'Class updated',
        `"${updated.title}" now starts ${fmt(updated.startsAt)}. Check the meeting link.`,
        id,
      );
    }
    return toClass(updated);
  },

  async cancel(userId: string, id: string) {
    const current = await requireOwned(userId, id);
    if (current.status === 'CANCELLED') throw AppError.conflict('Class is already cancelled');
    const cancelled = await classesRepository.cancel(id);
    await notifyMany(
      await classesRepository.bookedStudentIds(id),
      'CLASS_CANCELLED',
      'Class cancelled',
      `"${cancelled.title}" on ${fmt(cancelled.startsAt)} was cancelled by the tutor.`,
      id,
    );
    return toClass(cancelled);
  },

  async book(studentId: string, id: string) {
    const session = await classesRepository.findById(id);
    if (!session || session.status !== 'SCHEDULED' || session.startsAt.getTime() <= Date.now()) {
      throw AppError.notFound('Class not available');
    }
    if (session.course) {
      const enrolled = await coursesRepository.findEnrollment(session.course.id, studentId);
      if (!enrolled) throw AppError.forbidden('Enroll in the linked course to book this class');
    }
    if (await classesRepository.findBooking(id, studentId)) {
      throw AppError.conflict('You already booked this class');
    }
    try {
      await classesRepository.book(id, studentId, session.capacity);
    } catch (err) {
      if ((err as { code?: string }).code === 'P2002') {
        throw AppError.conflict('You already booked this class');
      }
      throw err;
    }
    return this.get(id);
  },

  async unbook(studentId: string, id: string) {
    if ((await classesRepository.unbook(id, studentId)) === 0) {
      throw AppError.notFound('You have not booked this class');
    }
  },

  // The link is the "ticket": owner, booked students and admins only.
  async getJoinLink(user: { id: string; role: Role }, id: string) {
    const session = await classesRepository.findById(id);
    if (!session) throw AppError.notFound('Class not found');
    if (session.status === 'CANCELLED') throw AppError.conflict('This class was cancelled');
    const isOwner = session.tutorProfileId === (await coursesRepository.profileIdOf(user.id));
    const booked = !!(await classesRepository.findBooking(id, user.id));
    if (!isOwner && !booked && user.role !== 'ADMIN') {
      throw AppError.forbidden('Book this class to get the meeting link');
    }
    return { meetingUrl: session.meetingUrl };
  },
};
