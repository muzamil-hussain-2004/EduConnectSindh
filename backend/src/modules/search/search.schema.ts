import { z } from 'zod';

const optionalBool = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true')
  .optional();

export const searchTutorsQuerySchema = z
  .object({
    q: z.string().trim().min(1).max(100).optional(),
    subjectId: z.uuid().optional(),
    areaId: z.uuid().optional(),
    // HOME matches HOME and BOTH tutors; ONLINE matches ONLINE and BOTH.
    mode: z.enum(['HOME', 'ONLINE']).optional(),
    minRate: z.coerce.number().int().min(0).optional(),
    maxRate: z.coerce.number().int().min(0).optional(),
    minExperience: z.coerce.number().int().min(0).max(60).optional(),
    minRating: z.coerce.number().min(1).max(5).optional(),
    verifiedOnly: optionalBool,
    sort: z.enum(['newest', 'priceAsc', 'priceDesc', 'experience', 'rating']).default('newest'),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(12),
  })
  .refine((v) => v.minRate === undefined || v.maxRate === undefined || v.minRate <= v.maxRate, {
    message: 'minRate cannot be greater than maxRate',
    path: ['minRate'],
  });

export type SearchTutorsQuery = z.infer<typeof searchTutorsQuerySchema>;

export const recommendQuerySchema = z.object({
  subjectId: z.uuid('subjectId is required'),
  areaId: z.uuid().optional(),
  mode: z.enum(['HOME', 'ONLINE']).optional(),
  budget: z.coerce.number().int().min(100).max(20000).optional(),
  limit: z.coerce.number().int().min(1).max(20).default(5),
});

export type RecommendQuery = z.infer<typeof recommendQuerySchema>;
