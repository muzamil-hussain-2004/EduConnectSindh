import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { notificationsController } from './notifications.controller';

export const notificationsRoutes = Router();
notificationsRoutes.use(authenticate);

notificationsRoutes.get('/', notificationsController.list);
notificationsRoutes.get('/unread-count', notificationsController.unreadCount);
notificationsRoutes.post('/read-all', notificationsController.markAllRead);
notificationsRoutes.post('/:id/read', notificationsController.markRead);
