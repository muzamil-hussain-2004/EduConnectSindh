import { z } from 'zod';

export const upsertTutorProfileSchema = z.object({
  headline: z.string().trim().min(5, 'Headline is too short').max(120),
  bio: z.string().trim().min(30, 'Bio must be at least 30 characters').max(2000),
  qualification: z.string().trim().min(2).max(200),
  experienceYears: z.number().int().min(0).max(60),
  hourlyRate: z.number().int().min(100, 'Minimum rate is PKR 100').max(20000),
  teachingMode: z.enum(['HOME', 'ONLINE', 'BOTH']),
  subjectIds: z.array(z.uuid()).min(1, 'Choose at least one subject').max(20),
  areaIds: z.array(z.uuid()).max(30).default([]),
  isPublished: z.boolean().default(false),
});

export const tutorIdParamSchema = z.object({ id: z.uuid('Invalid tutor id') });

export type UpsertTutorProfileInput = z.infer<typeof upsertTutorProfileSchema>;
