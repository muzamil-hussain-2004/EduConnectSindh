import { describe, expect, it } from 'vitest';
import reducer, { credentialsSet, loggedOut, sessionStarted } from './authSlice';
import type { User } from '@/types/api';

const user: User = {
  id: '1',
  email: 'a@b.com',
  fullName: 'A',
  phone: null,
  role: 'STUDENT',
  status: 'ACTIVE',
  emailVerified: false,
  createdAt: '',
};

describe('authSlice', () => {
  it('moves idle -> loading -> authenticated -> unauthenticated', () => {
    let s = reducer(undefined, { type: 'init' });
    expect(s.status).toBe('idle');
    s = reducer(s, sessionStarted());
    expect(s.status).toBe('loading');
    s = reducer(s, credentialsSet({ user, accessToken: 't' }));
    expect(s).toMatchObject({ status: 'authenticated', accessToken: 't' });
    s = reducer(s, loggedOut());
    expect(s).toEqual({ user: null, accessToken: null, status: 'unauthenticated' });
  });
});
