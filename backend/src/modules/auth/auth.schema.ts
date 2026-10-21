import { z } from 'zod';

const email = z
  .email('Enter a valid email address')
  .max(254)
  .transform((value) => value.trim().toLowerCase());

export const registerSchema = z.object({
  email,
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters')
    .regex(/[A-Za-z]/, 'Password must contain a letter')
    .regex(/\d/, 'Password must contain a number'),
  fullName: z.string().trim().min(2, 'Full name is too short').max(100),
  // Pakistani mobile: 03XXXXXXXXX or +923XXXXXXXXX
  phone: z
    .string()
    .regex(/^(\+92|0)3\d{9}$/, 'Enter a valid Pakistani mobile number')
    .optional(),
  // ADMIN accounts can never be self-registered.
  role: z.enum(['STUDENT', 'PARENT', 'TUTOR']),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
