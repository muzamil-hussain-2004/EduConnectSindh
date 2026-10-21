import { baseApi } from '@/services/api/baseApi';
import { paged, unwrap } from '@/features/catalog/catalogApi';
import type { ApiSuccess, Paged, Role, User } from '@/types/api';

export interface AdminStats {
  users: { total: number; suspended: number; byRole: Partial<Record<Role, number>> };
  tutors: { byVerification: Record<string, number> };
  courses: { byStatus: Record<string, number>; enrollments: number };
  classes: { upcoming: number; bookings: number };
  requests: { byStatus: Record<string, number> };
  reviews: { visible: number };
  signups: { date: string; count: number }[];
}

export interface AdminUsersQuery {
  page?: number;
  role?: Role;
  status?: 'ACTIVE' | 'SUSPENDED';
  search?: string;
}

export const adminApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getAdminStats: build.query<AdminStats, void>({
      query: () => '/admin/stats',
      transformResponse: unwrap,
      providesTags: ['Admin'],
    }),
    getAdminUsers: build.query<Paged<User>, AdminUsersQuery>({
      query: (params) => ({ url: '/users', params }),
      transformResponse: (res: ApiSuccess<User[]>) => paged(res),
      providesTags: ['Admin'],
    }),
    setUserStatus: build.mutation<User, { id: string; status: 'ACTIVE' | 'SUSPENDED' }>({
      query: ({ id, status }) => ({
        url: `/users/${id}/status`,
        method: 'PATCH',
        body: { status },
      }),
      transformResponse: (res: ApiSuccess<{ user: User }>) => res.data.user,
      invalidatesTags: ['Admin'],
    }),
  }),
});

export const { useGetAdminStatsQuery, useGetAdminUsersQuery, useSetUserStatusMutation } = adminApi;
