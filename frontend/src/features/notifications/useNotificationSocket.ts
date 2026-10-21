import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { store } from '@/app/store';
import { env } from '@/config/env';
import { baseApi } from '@/services/api/baseApi';
import type { AppNotification } from '@/types/api';

/**
 * Opens one Socket.IO connection while a user is signed in. A new notification shows a toast
 * and invalidates cached lists so badges and dashboards refresh without a page reload.
 */
export function useNotificationSocket() {
  const dispatch = useAppDispatch();
  const userId = useAppSelector((s) => s.auth.user?.id);

  useEffect(() => {
    if (!userId) return;
    const socket = io(env.socketUrl || undefined, {
      // A function, so every (re)connect sends the CURRENT access token, not a stale one.
      auth: (cb) => cb({ token: store.getState().auth.accessToken }),
    });
    socket.on('notification', (n: AppNotification) => {
      toast(n.title, { description: n.body });
      dispatch(
        baseApi.util.invalidateTags(['Notifications', 'Requests', 'Verification', 'Reviews']),
      );
    });
    return () => {
      socket.disconnect();
    };
  }, [userId, dispatch]);
}
