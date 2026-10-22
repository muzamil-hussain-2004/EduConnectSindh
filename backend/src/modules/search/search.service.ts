import { searchCache } from './search.cache';
import { avatarUrlFor } from '../../shared/utils/avatar';
import { searchRepository } from './search.repository';
import type { SearchTutorsQuery } from './search.schema';

const CACHE_TTL_SECONDS = 60;

export const searchService = {
  searchTutors: (query: SearchTutorsQuery) =>
    searchCache.getOrLoad(query, CACHE_TTL_SECONDS, async () => {
      const { items, total } = await searchRepository.searchTutors(query);
      return {
        items: items.map((t) => ({
          id: t.id,
          fullName: t.user.fullName,
          avatarUrl: avatarUrlFor(t.user.id, t.user.avatarFile),
          headline: t.headline,
          qualification: t.qualification,
          experienceYears: t.experienceYears,
          hourlyRate: t.hourlyRate,
          teachingMode: t.teachingMode,
          verificationStatus: t.verificationStatus,
          ratingAvg: t.ratingAvg,
          ratingCount: t.ratingCount,
          subjects: t.subjects,
          areas: t.areas,
        })),
        meta: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
        },
      };
    }),
};
