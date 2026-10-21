import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';
import { env } from '@/config/env';
import { credentialsSet, loggedOut, type AuthState } from '@/features/auth/authSlice';
import type { ApiErrorBody, ApiSuccess, AuthPayload } from '@/types/api';

const rawBaseQuery = fetchBaseQuery({
  baseUrl: env.apiUrl,
  credentials: 'include',
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as { auth: AuthState }).auth.accessToken;
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return headers;
  },
});

// Refresh tokens rotate and reuse is treated as theft, so concurrent refreshes
// must share ONE request (React StrictMode and parallel 401s would otherwise race).
let inFlight: Promise<AuthPayload | null> | null = null;

export function refreshSession(): Promise<AuthPayload | null> {
  inFlight ??= fetch(`${env.apiUrl}/auth/refresh`, { method: 'POST', credentials: 'include' })
    .then(async (res) => {
      if (!res.ok) return null;
      const body = (await res.json()) as ApiSuccess<AuthPayload>;
      return body.data;
    })
    .catch(() => null)
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

const NO_REAUTH = ['/auth/login', '/auth/register', '/auth/refresh'];

const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extra,
) => {
  let result = await rawBaseQuery(args, api, extra);
  const url = typeof args === 'string' ? args : args.url;

  if (result.error?.status === 401 && !NO_REAUTH.includes(url)) {
    const session = await refreshSession();
    if (session) {
      api.dispatch(credentialsSet(session));
      result = await rawBaseQuery(args, api, extra);
    } else {
      api.dispatch(loggedOut());
    }
  }
  return result;
};

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    'Me',
    'Tutor',
    'MyProfile',
    'Requests',
    'Shortlist',
    'Notifications',
    'Verification',
    'Reviews',
  ],
  endpoints: () => ({}),
});

export function getErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  const body = (error as FetchBaseQueryError | undefined)?.data as ApiErrorBody | undefined;
  return body?.error?.message ?? fallback;
}

/** Maps backend validation `details` to `{ fieldName: message }` for forms. */
export function getFieldErrors(error: unknown): Record<string, string> {
  const body = (error as FetchBaseQueryError | undefined)?.data as ApiErrorBody | undefined;
  const out: Record<string, string> = {};
  for (const d of body?.error?.details ?? []) out[d.field] = d.message;
  return out;
}
