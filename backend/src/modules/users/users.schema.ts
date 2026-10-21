import { z } from 'zod';

const phone = z.string().regex(/^(\+92|0)3\d{9}$/, 'Enter a valid Pakistani mobile number');

export const updateProfileSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Full name is too short').max(100).optional(),
    // null removes the phone number
    phone: phone.nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'Send at least one field to update');

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters')
    .regex(/[A-Za-z]/, 'Password must contain a letter')
    .regex(/\d/, 'Password must contain a number'),
});

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  role: z.enum(['STUDENT', 'PARENT', 'TUTOR', 'ADMIN']).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
  search: z.string().trim().min(1).max(100).optional(),
});

export const userIdParamSchema = z.object({ id: z.uuid('Invalid user id') });

export const updateStatusSchema = z.object({ status: z.enum(['ACTIVE', 'SUSPENDED']) });

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
