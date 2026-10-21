import { z } from 'zod';

export const idParamSchema = z.object({ id: z.uuid() });

export const reviewInputSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().min(10).max(1000),
});

export const moderateSchema = z.object({ note: z.string().trim().max(500).optional() });

export const listReviewsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const adminListQuerySchema = listReviewsQuerySchema.extend({
  status: z.enum(['VISIBLE', 'HIDDEN']).optional(),
});

export type ReviewInput = z.infer<typeof reviewInputSchema>;
export type ListReviewsQuery = z.infer<typeof listReviewsQuerySchema>;
export type AdminListQuery = z.infer<typeof adminListQuerySchema>;
