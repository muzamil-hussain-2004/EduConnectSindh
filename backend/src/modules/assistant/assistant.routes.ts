import { Router } from 'express';
import type { Request, Response } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { assistantLimiter } from '../../middlewares/rateLimit.middleware';
import { validateBody } from '../../middlewares/validate.middleware';
import { AppError } from '../../shared/errors/AppError';
import { idParamSchema } from '../courses/courses.schema';
import { askSchema } from './assistant.schema';
import { assistantService } from './assistant.service';

// Mounted at /courses (before coursesRoutes): POST /courses/:id/assistant
export const assistantRoutes = Router();

assistantRoutes.post(
  '/:id/assistant',
  authenticate,
  assistantLimiter,
  validateBody(askSchema),
  async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const { id } = idParamSchema.parse(req.params);
    res.json({ success: true, data: await assistantService.ask(req.user, id, req.body) });
  },
);
