import { z } from 'zod';

export const idParamSchema = z.object({ id: z.uuid() });

// Only https links are accepted so a "javascript:" URL can never reach the browser.
const meetingUrl = z
  .url()
  .max(500)
  .refine((u) => u.startsWith('https://'), 'Meeting link must start with https://');

export const classInputSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(1000).default(''),
  startsAt: z.coerce.date(),
  durationMin: z.number().int().min(15).max(240).default(60),
  meetingUrl,
  capacity: z.number().int().min(1).max(200).default(30),
  courseId: z.uuid().nullish(),
});
export const classUpdateSchema = classInputSchema.partial();

export const listClassesQuerySchema = z.object({
  courseId: z.uuid().optional(),
  tutorId: z.uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

export type ClassInput = z.infer<typeof classInputSchema>;
export type ClassUpdate = z.infer<typeof classUpdateSchema>;
export type ListClassesQuery = z.infer<typeof listClassesQuerySchema>;
