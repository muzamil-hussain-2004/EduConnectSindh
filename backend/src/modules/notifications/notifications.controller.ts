import type { Request, Response } from 'express';
import { AppError } from '../../shared/errors/AppError';
import { idParamSchema, listNotificationsQuerySchema } from './notifications.schema';
import { notificationsService } from './notifications.service';

const userId = (req: Request) => {
  if (!req.user) throw AppError.unauthorized();
  return req.user.id;
};

export const notificationsController = {
  async list(req: Request, res: Response) {
    const { items, meta } = await notificationsService.list(
      userId(req),
      listNotificationsQuerySchema.parse(req.query),
    );
    res.json({ success: true, data: items, meta });
  },

  async unreadCount(req: Request, res: Response) {
    res.json({
      success: true,
      data: { count: await notificationsService.unreadCount(userId(req)) },
    });
  },

  async markRead(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    res.json({
      success: true,
      data: { notification: await notificationsService.markRead(userId(req), id) },
    });
  },

  async markAllRead(req: Request, res: Response) {
    res.json({
      success: true,
      data: { updated: await notificationsService.markAllRead(userId(req)) },
    });
  },
};
