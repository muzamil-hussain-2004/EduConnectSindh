import { prisma } from '../../config/database';

export const authRepository = {
  createRefreshToken: (data: { tokenHash: string; userId: string; expiresAt: Date }) =>
    prisma.refreshToken.create({ data }),

  findRefreshToken: (tokenHash: string) =>
    prisma.refreshToken.findUnique({ where: { tokenHash }, include: { user: true } }),

  // Returns how many rows changed: 0 means someone else already revoked it.
  revokeRefreshToken: async (id: string) => {
    const result = await prisma.refreshToken.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return result.count;
  },

  revokeAllForUser: (userId: string) =>
    prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
};
