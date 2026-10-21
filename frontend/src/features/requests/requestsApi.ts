import { baseApi } from '@/services/api/baseApi';
import { paged } from '@/features/catalog/catalogApi';
import type { ApiSuccess, Paged, RequestStatus, ShortlistItem, TutorRequest } from '@/types/api';

export interface CreateRequestInput {
  tutorId: string;
  subjectId: string;
  areaId?: string;
  mode: 'HOME' | 'ONLINE';
  budgetPerHour?: number;
  message: string;
}

type ListArgs = { status?: RequestStatus; page?: number } | void;

const listRequests = (res: ApiSuccess<TutorRequest[]>) => paged(res);
const single = (res: ApiSuccess<{ request: TutorRequest }>) => res.data.request;

export const requestsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getMyRequests: build.query<Paged<TutorRequest>, ListArgs>({
      query: (params) => ({ url: '/requests/mine', params: params ?? undefined }),
      transformResponse: listRequests,
      providesTags: ['Requests'],
    }),
    getIncomingRequests: build.query<Paged<TutorRequest>, ListArgs>({
      query: (params) => ({ url: '/requests/incoming', params: params ?? undefined }),
      transformResponse: listRequests,
      providesTags: ['Requests'],
    }),
    createRequest: build.mutation<TutorRequest, CreateRequestInput>({
      query: (body) => ({ url: '/requests', method: 'POST', body }),
      transformResponse: single,
      invalidatesTags: ['Requests'],
    }),
    respondToRequest: build.mutation<
      TutorRequest,
      { id: string; action: 'accept' | 'decline' | 'cancel'; note?: string }
    >({
      query: ({ id, action, note }) => ({
        url: `/requests/${id}/${action}`,
        method: 'POST',
        body: note ? { note } : {},
      }),
      transformResponse: single,
      invalidatesTags: ['Requests'],
    }),
    getShortlist: build.query<ShortlistItem[], void>({
      query: () => '/shortlist',
      transformResponse: (res: ApiSuccess<ShortlistItem[]>) => res.data,
      providesTags: ['Shortlist'],
    }),
    addToShortlist: build.mutation<void, string>({
      query: (tutorId) => ({ url: `/shortlist/${tutorId}`, method: 'PUT' }),
      invalidatesTags: ['Shortlist'],
    }),
    removeFromShortlist: build.mutation<void, string>({
      query: (tutorId) => ({ url: `/shortlist/${tutorId}`, method: 'DELETE' }),
      invalidatesTags: ['Shortlist'],
    }),
  }),
});

export const {
  useGetMyRequestsQuery,
  useGetIncomingRequestsQuery,
  useCreateRequestMutation,
  useRespondToRequestMutation,
  useGetShortlistQuery,
  useAddToShortlistMutation,
  useRemoveFromShortlistMutation,
} = requestsApi;
