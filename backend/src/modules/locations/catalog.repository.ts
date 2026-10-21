import { prisma } from '../../config/database';

export const catalogRepository = {
  cities: () =>
    prisma.city.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        areas: { orderBy: { name: 'asc' }, select: { id: true, name: true } },
      },
    }),

  subjects: () =>
    prisma.subject.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
};
