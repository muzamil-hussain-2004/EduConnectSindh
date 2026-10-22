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

  async setAvatar(req: Request, res: Response) {
    const user = await usersService.setAvatar(currentUserId(req), req.file);
    res.json({ success: true, data: { user } });
  },

  async removeAvatar(req: Request, res: Response) {
    const user = await usersService.removeAvatar(currentUserId(req));
    res.json({ success: true, data: { user } });
  },

  // Public on purpose: profile pictures are visible to everyone.
  async avatar(req: Request, res: Response) {
    const { id } = userIdParamSchema.parse(req.params);
    const file = await usersService.avatarPath(id);
    res.type(file.mimeType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.sendFile(file.path, { dotfiles: 'allow' });
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
