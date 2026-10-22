import { baseApi } from '@/services/api/baseApi';
import { credentialsSet, loggedOut, userUpdated } from './authSlice';
import type { ApiSuccess, AuthPayload, User } from '@/types/api';
import type { LoginInput, RegisterPayload } from './auth.schemas';

export const authApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    login: build.mutation<AuthPayload, LoginInput>({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
      transformResponse: (res: ApiSuccess<AuthPayload>) => res.data,
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled;
        dispatch(credentialsSet(data));
      },
    }),
    register: build.mutation<AuthPayload, RegisterPayload>({
      query: (body) => ({ url: '/auth/register', method: 'POST', body }),
      transformResponse: (res: ApiSuccess<AuthPayload>) => res.data,
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled;
        dispatch(credentialsSet(data));
      },
    }),
    logout: build.mutation<void, void>({
      query: () => ({ url: '/auth/logout', method: 'POST' }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
        } finally {
          dispatch(loggedOut());
          dispatch(baseApi.util.resetApiState());
        }
      },
    }),
    uploadAvatar: build.mutation<User, File>({
      query: (file) => {
        const body = new FormData();
        body.append('file', file);
        return { url: '/users/me/avatar', method: 'POST', body };
      },
      transformResponse: (res: ApiSuccess<{ user: User }>) => res.data.user,
      invalidatesTags: ['Tutor', 'Courses', 'Reviews', 'Shortlist'],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        dispatch(userUpdated((await queryFulfilled).data));
      },
    }),
    removeAvatar: build.mutation<User, void>({
      query: () => ({ url: '/users/me/avatar', method: 'DELETE' }),
      transformResponse: (res: ApiSuccess<{ user: User }>) => res.data.user,
      invalidatesTags: ['Tutor', 'Courses', 'Reviews', 'Shortlist'],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        dispatch(userUpdated((await queryFulfilled).data));
      },
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
  useUploadAvatarMutation,
  useRemoveAvatarMutation,
} = authApi;
