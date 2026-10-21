import { Router } from 'express';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { validateBody } from '../../middlewares/validate.middleware';
import { reviewsController } from './reviews.controller';
import { reviewInputSchema } from './reviews.schema';

// Mounted at /tutors (before tutorsRoutes): /tutors/:id/reviews
export const tutorReviewsRoutes = Router();

tutorReviewsRoutes.get('/:id/reviews', reviewsController.list);
tutorReviewsRoutes.put(
  '/:id/reviews',
  authenticate,
  authorize('STUDENT', 'PARENT'),
  validateBody(reviewInputSchema),
  reviewsController.save,
);
tutorReviewsRoutes.delete(
  '/:id/reviews',
  authenticate,
  authorize('STUDENT', 'PARENT'),
  reviewsController.remove,
);

// Mounted at /reviews: admin moderation queue.
export const adminReviewsRoutes = Router();
adminReviewsRoutes.use(authenticate, authorize('ADMIN'));

adminReviewsRoutes.get('/', reviewsController.adminList);
adminReviewsRoutes.post('/:id/hide', reviewsController.hide);
adminReviewsRoutes.post('/:id/unhide', reviewsController.unhide);
