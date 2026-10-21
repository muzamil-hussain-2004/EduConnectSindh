import { useEffect, type ReactNode } from 'react';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { credentialsSet, loggedOut, sessionStarted } from '@/features/auth/authSlice';
import { refreshSession } from '@/services/api/baseApi';

/** On first load, trade the httpOnly refresh cookie for a fresh access token. */
export function AuthBootstrap({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const status = useAppSelector((s) => s.auth.status);

  useEffect(() => {
    if (status !== 'idle') return;
    dispatch(sessionStarted());
    void refreshSession().then((session) => {
      dispatch(session ? credentialsSet(session) : loggedOut());
    });
  }, [dispatch, status]);

  return <>{children}</>;
}
