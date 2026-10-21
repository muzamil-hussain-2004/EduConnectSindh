import type { User } from '../../database/generated/prisma/client';
import { AppError } from '../../shared/errors/AppError';
import type { CreateUserData } from './users.repository';
import { usersRepository } from './users.repository';

// The only shape of a user that may leave the server (no passwordHash).
export function toPublicUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    role: user.role,
    status: user.status,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
  };
}

export const usersService = {
  findByEmail: (email: string) => usersRepository.findByEmail(email),

  async getById(id: string) {
    const user = await usersRepository.findById(id);
    if (!user) throw AppError.notFound('User not found');
    return user;
  },

  create: (data: CreateUserData) => usersRepository.create(data),
};
