import type { Role } from '../../database/generated/prisma/client';
import { AppError } from '../../shared/errors/AppError';
import { coursesRepository } from '../courses/courses.repository';
import { answerQuestion } from './assistant.provider';
import type { AskInput } from './assistant.schema';

export const assistantService = {
  // Lesson text is paid-for content, so the same rule as reading a lesson applies:
  // owner, enrolled student or admin.
  async ask(user: { id: string; role: Role }, courseId: string, input: AskInput) {
    const course = await coursesRepository.findOwner(courseId);
    if (!course) throw AppError.notFound('Course not found');

    const isOwner = course.tutorProfileId === (await coursesRepository.profileIdOf(user.id));
    const enrolled = !!(await coursesRepository.findEnrollment(courseId, user.id));
    if (!isOwner && !enrolled && user.role !== 'ADMIN') {
      throw AppError.forbidden('Enroll in this course to use the assistant');
    }

    const lessons = await coursesRepository.lessonsForAssistant(courseId);
    if (input.lessonId && !lessons.some((l) => l.id === input.lessonId)) {
      throw AppError.badRequest('That lesson is not part of this course');
    }
    return answerQuestion(input.question, course.title, lessons, input.lessonId);
  },
};
