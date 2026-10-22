import { Router } from 'express';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { uploadAvatarFile } from '../../middlewares/upload.middleware';
import { validateBody } from '../../middlewares/validate.middleware';
import { usersController } from './users.controller';
import { changePasswordSchema, updateProfileSchema, updateStatusSchema } from './users.schema';

export const usersRoutes = Router();

usersRoutes.get('/:id/avatar', usersController.avatar);

usersRoutes.use(authenticate);

usersRoutes.post('/me/avatar', uploadAvatarFile, usersController.setAvatar);
usersRoutes.delete('/me/avatar', usersController.removeAvatar);

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
