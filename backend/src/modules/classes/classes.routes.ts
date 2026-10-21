import { Router } from 'express';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { validateBody } from '../../middlewares/validate.middleware';
import { classesController as c } from './classes.controller';
import { classInputSchema, classUpdateSchema } from './classes.schema';

const tutorOnly = [authenticate, authorize('TUTOR')];
const learner = [authenticate, authorize('STUDENT', 'PARENT')];

// Mounted at /classes. Fixed paths (/mine, /booked) come before /:id.
export const classesRoutes = Router();

classesRoutes.get('/', c.list);
classesRoutes.get('/mine', ...tutorOnly, c.mine);
classesRoutes.get('/booked', ...learner, c.booked);
classesRoutes.post('/', ...tutorOnly, validateBody(classInputSchema), c.create);

classesRoutes.get('/:id', c.get);
classesRoutes.get('/:id/join', authenticate, c.join);
classesRoutes.patch('/:id', ...tutorOnly, validateBody(classUpdateSchema), c.update);
classesRoutes.post('/:id/cancel', ...tutorOnly, c.cancel);
classesRoutes.post('/:id/book', ...learner, c.book);
classesRoutes.delete('/:id/book', ...learner, c.unbook);
