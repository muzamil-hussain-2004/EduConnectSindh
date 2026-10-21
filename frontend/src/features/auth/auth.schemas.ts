import { z } from 'zod';

// Mirrors backend/src/modules/auth/auth.schema.ts so users get instant feedback.
export const loginSchema = z.object({
  email: z.email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name is required'),
  email: z.email('Enter a valid email'),
  phone: z
    .string()
    .trim()
    .regex(/^(03\d{9}|\+923\d{9})$/, 'Use 03XXXXXXXXX or +923XXXXXXXXX')
    .or(z.literal('')),
  password: z
    .string()
    .min(8, 'At least 8 characters')
    .regex(/[A-Za-z]/, 'Must contain a letter')
    .regex(/\d/, 'Must contain a number'),
  role: z.enum(['STUDENT', 'PARENT', 'TUTOR']),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.input<typeof registerSchema>;
export type RegisterPayload = Omit<RegisterInput, 'phone'> & { phone?: string };
