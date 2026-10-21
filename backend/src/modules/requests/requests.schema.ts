import { z } from 'zod';

export const idParamSchema = z.object({ id: z.uuid('Invalid id') });

export const createRequestSchema = z.object({
  tutorId: z.uuid('Invalid tutor id'),
  subjectId: z.uuid('Invalid subject id'),
  areaId: z.uuid('Invalid area id').optional(),
  mode: z.enum(['HOME', 'ONLINE']),
  budgetPerHour: z.number().int().min(100).max(20000).optional(),
  message: z.string().trim().min(10, 'Message must be at least 10 characters').max(1000),
});

export const respondSchema = z.object({
  note: z.string().trim().min(1).max(500).optional(),
});

export const listRequestsQuerySchema = z.object({
  status: z.enum(['PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type CreateRequestInput = z.infer<typeof createRequestSchema>;
export type ListRequestsQuery = z.infer<typeof listRequestsQuerySchema>;
