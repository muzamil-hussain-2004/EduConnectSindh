import type { Request, Response } from 'express';
import { AppError } from '../../shared/errors/AppError';
import { listUsersQuerySchema, userIdParamSchema } from './users.schema';
import { usersService } from './users.service';

const currentUserId = (req: Request) => {
  if (!req.user) throw AppError.unauthorized();
  return req.user.id;
};

export const usersController = {
  async updateMe(req: Request, res: Response) {
    const user = await usersService.updateProfile(currentUserId(req), req.body);
    res.json({ success: true, data: { user } });
  },

  async changePassword(req: Request, res: Response) {
    await usersService.changePassword(currentUserId(req), req.body);
    res.json({ success: true, data: null });
  },

  async list(req: Request, res: Response) {
    const { items, meta } = await usersService.list(listUsersQuerySchema.parse(req.query));
    res.json({ success: true, data: items, meta });
  },

  async setStatus(req: Request, res: Response) {
    const { id } = userIdParamSchema.parse(req.params);
    const user = await usersService.setStatus(currentUserId(req), id, req.body.status);
    res.json({ success: true, data: { user } });
  },
};
