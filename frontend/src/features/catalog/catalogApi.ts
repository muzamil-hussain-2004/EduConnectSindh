import { baseApi } from '@/services/api/baseApi';
import type { ApiSuccess, City, PageMeta, Paged } from '@/types/api';

/** Unwraps `{ success, data, meta }` into `{ items, meta }` for list endpoints. */
export function paged<T>(res: ApiSuccess<T[]>): Paged<T> {
  return { items: res.data, meta: res.meta as PageMeta | undefined };
}

export const unwrap = <T>(res: ApiSuccess<T>) => res.data;

export const catalogApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getCities: build.query<City[], void>({
      query: () => '/catalog/cities',
      transformResponse: unwrap,
    }),
    getSubjects: build.query<{ id: string; name: string }[], void>({
      query: () => '/catalog/subjects',
      transformResponse: unwrap,
    }),
  }),
});

export const { useGetCitiesQuery, useGetSubjectsQuery } = catalogApi;
