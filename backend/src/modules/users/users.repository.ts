import { prisma } from '../../config/database';
import type { Role } from '../../database/generated/prisma/client';

export interface CreateUserData {
  email: string;
  passwordHash: string;
  fullName: string;
  phone?: string | undefined;
  role: Role;
}

export const usersRepository = {
  findByEmail: (email: string) => prisma.user.findUnique({ where: { email } }),

  findById: (id: string) => prisma.user.findUnique({ where: { id } }),

  create: (data: CreateUserData) => prisma.user.create({ data }),
};
