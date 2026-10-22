import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AuthPayload, User } from '@/types/api';

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  status: AuthStatus;
}

const initialState: AuthState = { user: null, accessToken: null, status: 'idle' };

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    sessionStarted(state) {
      state.status = 'loading';
    },
    credentialsSet(state, action: PayloadAction<AuthPayload>) {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.status = 'authenticated';
    },
    loggedOut(state) {
      state.user = null;
      state.accessToken = null;
      state.status = 'unauthenticated';
    },
    userUpdated(state, action: PayloadAction<User>) {
      state.user = action.payload;
    },
  },
});

export const { sessionStarted, credentialsSet, loggedOut, userUpdated } = authSlice.actions;
export default authSlice.reducer;
