import { z } from 'zod';

export const idParamSchema = z.object({ id: z.uuid() });
export const lessonParamsSchema = z.object({ id: z.uuid(), lessonId: z.uuid() });

const level = z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']);

export const courseInputSchema = z.object({
  title: z.string().trim().min(5).max(120),
  description: z.string().trim().min(20).max(3000),
  subjectId: z.uuid(),
  level: level.default('BEGINNER'),
  price: z.number().int().min(0).max(100_000).default(0),
});
export const courseUpdateSchema = courseInputSchema.partial();

// Only https links are accepted so a "javascript:" URL can never reach the browser.
const videoUrl = z
  .url()
  .max(500)
  .refine((u) => u.startsWith('https://'), 'Video link must start with https://');

export const lessonInputSchema = z.object({
  title: z.string().trim().min(3).max(120),
  content: z.string().trim().min(10).max(20_000),
  videoUrl: videoUrl.nullish(),
  durationMin: z.number().int().min(1).max(600).default(10),
});
export const lessonUpdateSchema = lessonInputSchema
  .partial()
  .extend({ position: z.number().int().min(1).optional() });

export const listCoursesQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  subjectId: z.uuid().optional(),
  level: level.optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  freeOnly: z.enum(['true', 'false']).optional(),
  sort: z.enum(['newest', 'popular', 'priceAsc', 'priceDesc']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

export const pageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

export type CourseInput = z.infer<typeof courseInputSchema>;
export type CourseUpdate = z.infer<typeof courseUpdateSchema>;
export type LessonInput = z.infer<typeof lessonInputSchema>;
export type LessonUpdate = z.infer<typeof lessonUpdateSchema>;
export type ListCoursesQuery = z.infer<typeof listCoursesQuerySchema>;
export type PageQuery = z.infer<typeof pageQuerySchema>;
