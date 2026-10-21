import { baseApi } from '@/services/api/baseApi';
import { paged, unwrap } from '@/features/catalog/catalogApi';
import type { ApiSuccess, Paged } from '@/types/api';

export interface ClassSession {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  durationMin: number;
  capacity: number;
  status: 'SCHEDULED' | 'CANCELLED';
  course: { id: string; title: string } | null;
  tutor: { id: string; fullName: string };
  bookingCount: number;
  seatsLeft: number;
}

export interface ClassInput {
  title: string;
  description?: string;
  startsAt: string;
  durationMin: number;
  meetingUrl: string;
  capacity: number;
  courseId?: string | null;
}

const session = (res: ApiSuccess<{ session: ClassSession }>) => res.data.session;

export const classesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getUpcomingClasses: build.query<Paged<ClassSession>, { page?: number; courseId?: string }>({
      query: (params) => ({ url: '/classes', params }),
      transformResponse: (res: ApiSuccess<ClassSession[]>) => paged(res),
      providesTags: ['Classes'],
    }),
    getMyClasses: build.query<ClassSession[], void>({
      query: () => '/classes/mine',
      transformResponse: unwrap,
      providesTags: ['Classes'],
    }),
    getBookedClasses: build.query<ClassSession[], void>({
      query: () => '/classes/booked',
      transformResponse: unwrap,
      providesTags: ['Classes'],
    }),
    createClass: build.mutation<ClassSession, ClassInput>({
      query: (body) => ({ url: '/classes', method: 'POST', body }),
      transformResponse: session,
      invalidatesTags: ['Classes'],
    }),
    cancelClass: build.mutation<ClassSession, string>({
      query: (id) => ({ url: `/classes/${id}/cancel`, method: 'POST' }),
      transformResponse: session,
      invalidatesTags: ['Classes'],
    }),
    bookClass: build.mutation<ClassSession, string>({
      query: (id) => ({ url: `/classes/${id}/book`, method: 'POST' }),
      transformResponse: session,
      invalidatesTags: ['Classes'],
    }),
    getJoinLink: build.query<string, string>({
      query: (id) => `/classes/${id}/join`,
      transformResponse: (res: ApiSuccess<{ meetingUrl: string }>) => res.data.meetingUrl,
      keepUnusedDataFor: 0,
    }),
    unbookClass: build.mutation<null, string>({
      query: (id) => ({ url: `/classes/${id}/book`, method: 'DELETE' }),
      transformResponse: unwrap,
      invalidatesTags: ['Classes'],
    }),
  }),
});

export const {
  useGetUpcomingClassesQuery,
  useGetMyClassesQuery,
  useGetBookedClassesQuery,
  useCreateClassMutation,
  useCancelClassMutation,
  useBookClassMutation,
  useUnbookClassMutation,
  useLazyGetJoinLinkQuery,
} = classesApi;
