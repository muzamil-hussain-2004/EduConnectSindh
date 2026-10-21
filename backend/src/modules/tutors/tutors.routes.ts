import { Router } from 'express';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { validateBody } from '../../middlewares/validate.middleware';
import { tutorsController } from './tutors.controller';
import { upsertTutorProfileSchema } from './tutors.schema';

export const tutorsRoutes = Router();

// `/me` routes must come before `/:id`, otherwise "me" would be read as an id.
tutorsRoutes.get('/me', authenticate, authorize('TUTOR'), tutorsController.getMine);
tutorsRoutes.put(
  '/me',
  authenticate,
  authorize('TUTOR'),
  validateBody(upsertTutorProfileSchema),
  tutorsController.saveMine,
);

tutorsRoutes.get('/:id', tutorsController.getPublic);
