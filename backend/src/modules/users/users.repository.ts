import { prisma } from '../../config/database';
import type { Prisma, Role } from '../../database/generated/prisma/client';
import type { ListUsersQuery } from './users.schema';

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

  update: (id: string, data: Prisma.UserUpdateInput) => prisma.user.update({ where: { id }, data }),

  async list(query: ListUsersQuery) {
    const where: Prisma.UserWhereInput = {
      ...(query.role ? { role: query.role } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { fullName: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.user.count({ where }),
    ]);
    return { items, total };
  },
};
