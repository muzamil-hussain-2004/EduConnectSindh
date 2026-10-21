import type { User, UserStatus } from '../../database/generated/prisma/client';
import { AppError } from '../../shared/errors/AppError';
import { hashPassword, verifyPassword } from '../../shared/utils/password';
import { authRepository } from '../auth/auth.repository';
import type { CreateUserData } from './users.repository';
import { usersRepository } from './users.repository';
import type { ChangePasswordInput, ListUsersQuery, UpdateProfileInput } from './users.schema';

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

  async updateProfile(id: string, input: UpdateProfileInput) {
    return toPublicUser(await usersRepository.update(id, input));
  },

  // Every device is logged out afterwards (refresh tokens revoked); the current access token
  // stays valid until it expires (max 15 min).
  async changePassword(id: string, input: ChangePasswordInput) {
    const user = await this.getById(id);
    if (!(await verifyPassword(user.passwordHash, input.currentPassword))) {
      throw AppError.badRequest('Current password is incorrect');
    }
    if (input.currentPassword === input.newPassword) {
      throw AppError.badRequest('New password must be different from the current one');
    }
    await usersRepository.update(id, { passwordHash: await hashPassword(input.newPassword) });
    await authRepository.revokeAllForUser(id);
  },

  async list(query: ListUsersQuery) {
    const { items, total } = await usersRepository.list(query);
    return {
      items: items.map(toPublicUser),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  },

  async setStatus(actorId: string, targetId: string, status: UserStatus) {
    if (actorId === targetId) throw AppError.badRequest('You cannot change your own status');
    const target = await this.getById(targetId);
    if (target.role === 'ADMIN') throw AppError.forbidden('Admin accounts cannot be suspended');

    const updated = await usersRepository.update(targetId, { status });
    if (status === 'SUSPENDED') await authRepository.revokeAllForUser(targetId);
    return toPublicUser(updated);
  },
};
