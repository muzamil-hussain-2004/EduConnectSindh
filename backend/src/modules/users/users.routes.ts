import { Router } from 'express';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { validateBody } from '../../middlewares/validate.middleware';
import { usersController } from './users.controller';
import { changePasswordSchema, updateProfileSchema, updateStatusSchema } from './users.schema';

export const usersRoutes = Router();

usersRoutes.use(authenticate);

usersRoutes.patch('/me', validateBody(updateProfileSchema), usersController.updateMe);
usersRoutes.post(
  '/me/password',
  validateBody(changePasswordSchema),
  usersController.changePassword,
);

usersRoutes.get('/', authorize('ADMIN'), usersController.list);
usersRoutes.patch(
  '/:id/status',
  authorize('ADMIN'),
  validateBody(updateStatusSchema),
  usersController.setStatus,
);
