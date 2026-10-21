import { baseApi } from '@/services/api/baseApi';
import { paged } from '@/features/catalog/catalogApi';
import type { ApiSuccess, AppNotification, Paged } from '@/types/api';

export const notificationsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getNotifications: build.query<Paged<AppNotification>, { page?: number } | void>({
      query: (params) => ({ url: '/notifications', params: { limit: 20, ...(params ?? {}) } }),
      transformResponse: (res: ApiSuccess<AppNotification[]>) => paged(res),
      providesTags: ['Notifications'],
    }),
    getUnreadCount: build.query<number, void>({
      query: () => '/notifications/unread-count',
      transformResponse: (res: ApiSuccess<{ count: number }>) => res.data.count,
      providesTags: ['Notifications'],
    }),
    markNotificationRead: build.mutation<void, string>({
      query: (id) => ({ url: `/notifications/${id}/read`, method: 'POST', body: {} }),
      invalidatesTags: ['Notifications'],
    }),
    markAllNotificationsRead: build.mutation<void, void>({
      query: () => ({ url: '/notifications/read-all', method: 'POST', body: {} }),
      invalidatesTags: ['Notifications'],
    }),
  }),
});

export const {
  useGetNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} = notificationsApi;
