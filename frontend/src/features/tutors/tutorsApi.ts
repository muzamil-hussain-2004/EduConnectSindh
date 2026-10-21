import { baseApi } from '@/services/api/baseApi';
import { paged } from '@/features/catalog/catalogApi';
import type {
  AdminReview,
  ApiSuccess,
  Paged,
  Review,
  TeachingMode,
  TutorProfile,
  TutorSummary,
} from '@/types/api';

export interface TutorSearchParams {
  q?: string;
  subjectId?: string;
  areaId?: string;
  mode?: 'HOME' | 'ONLINE';
  minRate?: number;
  maxRate?: number;
  minExperience?: number;
  minRating?: number;
  verifiedOnly?: boolean;
  sort?: 'newest' | 'priceAsc' | 'priceDesc' | 'experience' | 'rating';
  page?: number;
  limit?: number;
}

export interface TutorProfileInput {
  headline: string;
  bio: string;
  qualification: string;
  experienceYears: number;
  hourlyRate: number;
  teachingMode: TeachingMode;
  subjectIds: string[];
  areaIds: string[];
  isPublished: boolean;
}

export const tutorsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    searchTutors: build.query<Paged<TutorSummary>, TutorSearchParams>({
      query: (params) => ({ url: '/tutors', params }),
      transformResponse: (res: ApiSuccess<TutorSummary[]>) => paged(res),
      providesTags: ['Tutor'],
    }),
    getTutor: build.query<TutorProfile, string>({
      query: (id) => `/tutors/${id}`,
      transformResponse: (res: ApiSuccess<{ tutor: TutorProfile }>) => res.data.tutor,
      providesTags: (_r, _e, id) => [{ type: 'Tutor', id }],
    }),
    getTutorReviews: build.query<Paged<Review>, { id: string; page?: number }>({
      query: ({ id, page = 1 }) => ({ url: `/tutors/${id}/reviews`, params: { page, limit: 5 } }),
      transformResponse: (res: ApiSuccess<Review[]>) => paged(res),
      providesTags: ['Reviews'],
    }),
    saveReview: build.mutation<void, { id: string; rating: number; comment: string }>({
      query: ({ id, ...body }) => ({ url: `/tutors/${id}/reviews`, method: 'PUT', body }),
      invalidatesTags: ['Reviews', 'Tutor'],
    }),
    getMyTutorProfile: build.query<TutorProfile, void>({
      query: () => '/tutors/me',
      transformResponse: (res: ApiSuccess<{ tutor: TutorProfile }>) => res.data.tutor,
      providesTags: ['MyProfile'],
    }),
    saveMyTutorProfile: build.mutation<TutorProfile, TutorProfileInput>({
      query: (body) => ({ url: '/tutors/me', method: 'PUT', body }),
      transformResponse: (res: ApiSuccess<{ tutor: TutorProfile }>) => res.data.tutor,
      invalidatesTags: ['MyProfile', 'Tutor'],
    }),
    adminListReviews: build.query<
      Paged<AdminReview>,
      { status?: 'VISIBLE' | 'HIDDEN'; page?: number }
    >({
      query: (params) => ({ url: '/reviews', params }),
      transformResponse: (res: ApiSuccess<AdminReview[]>) => paged(res),
      providesTags: ['Reviews'],
    }),
    moderateReview: build.mutation<void, { id: string; action: 'hide' | 'unhide' }>({
      query: ({ id, action }) => ({ url: `/reviews/${id}/${action}`, method: 'POST', body: {} }),
      invalidatesTags: ['Reviews', 'Tutor'],
    }),
  }),
});

export const {
  useSearchTutorsQuery,
  useGetTutorQuery,
  useGetTutorReviewsQuery,
  useSaveReviewMutation,
  useGetMyTutorProfileQuery,
  useSaveMyTutorProfileMutation,
  useAdminListReviewsQuery,
  useModerateReviewMutation,
} = tutorsApi;
