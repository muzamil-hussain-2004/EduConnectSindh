import { z } from 'zod';

export const askSchema = z.object({
  question: z.string().trim().min(3, 'Ask a longer question').max(500),
  lessonId: z.uuid().optional(),
});

export type AskInput = z.infer<typeof askSchema>;
