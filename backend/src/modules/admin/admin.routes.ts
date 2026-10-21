import { Router } from 'express';
import type { Request, Response } from 'express';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { adminService } from './admin.service';

export const adminRoutes = Router();

adminRoutes.use(authenticate, authorize('ADMIN'));

adminRoutes.get('/stats', async (_req: Request, res: Response) => {
  res.json({ success: true, data: await adminService.stats() });
});
