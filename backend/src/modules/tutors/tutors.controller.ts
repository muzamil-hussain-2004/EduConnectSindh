import type { Request, Response } from 'express';
import { AppError } from '../../shared/errors/AppError';
import { tutorIdParamSchema } from './tutors.schema';
import { tutorsService } from './tutors.service';

const currentUserId = (req: Request) => {
  if (!req.user) throw AppError.unauthorized();
  return req.user.id;
};

export const tutorsController = {
  async getMine(req: Request, res: Response) {
    res.json({ success: true, data: { tutor: await tutorsService.getMine(currentUserId(req)) } });
  },

  async saveMine(req: Request, res: Response) {
    const tutor = await tutorsService.saveMine(currentUserId(req), req.body);
    res.json({ success: true, data: { tutor } });
  },

  async getPublic(req: Request, res: Response) {
    const { id } = tutorIdParamSchema.parse(req.params);
    res.json({ success: true, data: { tutor: await tutorsService.getPublic(id) } });
  },
};
