import { z } from 'zod';

export const uploadDocumentSchema = z.object({
  type: z.enum(['CNIC_FRONT', 'CNIC_BACK', 'DEGREE', 'OTHER']),
});

export const rejectSchema = z.object({
  reason: z.string().trim().min(5, 'Please give a reason (at least 5 characters)').max(500),
});

export const idParamSchema = z.object({ id: z.uuid('Invalid id') });

export const listRequestsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['PENDING', 'VERIFIED', 'REJECTED']).default('PENDING'),
});

export type DocumentTypeInput = z.infer<typeof uploadDocumentSchema>['type'];
export type ListRequestsQuery = z.infer<typeof listRequestsQuerySchema>;
