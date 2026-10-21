import { Router } from 'express';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { validateBody } from '../../middlewares/validate.middleware';
import { coursesController as c } from './courses.controller';
import {
  courseInputSchema,
  courseUpdateSchema,
  lessonInputSchema,
  lessonUpdateSchema,
} from './courses.schema';

const tutorOnly = [authenticate, authorize('TUTOR')];
const learner = [authenticate, authorize('STUDENT', 'PARENT')];

// Mounted at /courses. Fixed paths (/mine) are registered before /:id.
export const coursesRoutes = Router();

coursesRoutes.get('/', c.list);
coursesRoutes.get('/mine', ...tutorOnly, c.mine);
coursesRoutes.post('/', ...tutorOnly, validateBody(courseInputSchema), c.create);

coursesRoutes.get('/:id', c.get);
coursesRoutes.get('/:id/manage', ...tutorOnly, c.manage);
coursesRoutes.patch('/:id', ...tutorOnly, validateBody(courseUpdateSchema), c.update);
coursesRoutes.delete('/:id', ...tutorOnly, c.remove);
coursesRoutes.post('/:id/publish', ...tutorOnly, c.publish);
coursesRoutes.post('/:id/unpublish', ...tutorOnly, c.unpublish);

coursesRoutes.post('/:id/lessons', ...tutorOnly, validateBody(lessonInputSchema), c.addLesson);
coursesRoutes.patch(
  '/:id/lessons/:lessonId',
  ...tutorOnly,
  validateBody(lessonUpdateSchema),
  c.updateLesson,
);
coursesRoutes.delete('/:id/lessons/:lessonId', ...tutorOnly, c.deleteLesson);

// Any signed-in user; the service checks owner / enrolled / admin.
coursesRoutes.get('/:id/lessons/:lessonId', authenticate, c.getLesson);

coursesRoutes.post('/:id/enroll', ...learner, c.enroll);
coursesRoutes.delete('/:id/enroll', ...learner, c.unenroll);
coursesRoutes.get('/:id/enrollment', ...learner, c.enrollment);
coursesRoutes.post('/:id/lessons/:lessonId/complete', ...learner, c.complete);
coursesRoutes.delete('/:id/lessons/:lessonId/complete', ...learner, c.uncomplete);

// Mounted at /enrollments
export const enrollmentsRoutes = Router();
enrollmentsRoutes.get('/mine', ...learner, c.myEnrollments);
