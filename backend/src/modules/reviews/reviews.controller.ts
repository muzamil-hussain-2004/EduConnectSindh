import type { Request, Response } from 'express';
import { AppError } from '../../shared/errors/AppError';
import {
  adminListQuerySchema,
  idParamSchema,
  listReviewsQuerySchema,
  moderateSchema,
} from './reviews.schema';
import { reviewsService } from './reviews.service';

const userId = (req: Request) => {
  if (!req.user) throw AppError.unauthorized();
  return req.user.id;
};

export const reviewsController = {
  async list(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    const { items, meta } = await reviewsService.listForTutor(
      id,
      listReviewsQuerySchema.parse(req.query),
    );
    res.json({ success: true, data: items, meta });
  },

  async save(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    const review = await reviewsService.saveMine(userId(req), id, req.body);
    res.json({ success: true, data: { review } });
  },

  async remove(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    await reviewsService.deleteMine(userId(req), id);
    res.json({ success: true, data: null });
  },

  async adminList(req: Request, res: Response) {
    const { items, meta } = await reviewsService.listAll(adminListQuerySchema.parse(req.query));
    res.json({ success: true, data: items, meta });
  },

  async hide(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    const { note } = moderateSchema.parse(req.body ?? {});
    res.json({
      success: true,
      data: { review: await reviewsService.moderate(id, 'HIDDEN', note) },
    });
  },

  async unhide(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    res.json({ success: true, data: { review: await reviewsService.moderate(id, 'VISIBLE') } });
  },
};
