import { baseApi } from '@/services/api/baseApi';
import { credentialsSet, loggedOut } from './authSlice';
import type { ApiSuccess, AuthPayload } from '@/types/api';
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
  }),
});

export const { useLoginMutation, useRegisterMutation, useLogoutMutation } = authApi;
