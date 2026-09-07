import { useEffect, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { connectSocket, disconnectSocket } from '@/lib/socket';
import { JOBS_KEY, NOTIFICATIONS_KEY, TIMELINE_KEY, jobKey } from '@/lib/query-keys';
import type { Notification } from '@/types/notification';

/**
 * Native real-time socket channel for authenticated app sessions:
 * - Connects socket with bearer token auth on mount.
 * - Prepends incoming pushed 'notification' events directly into TanStack Query's NOTIFICATIONS_KEY cache.
 * - Invalidates timeline and relevant job queries so activity stays live.
 * - Disconnects socket cleanly on unmount / sign-out.
 */
export function RealtimeProvider({ children }: { children?: ReactNode }) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = connectSocket();

    function onNotification(payload: Notification) {
      queryClient.setQueryData<Notification[]>(NOTIFICATIONS_KEY, (prev) =>
        prev ? [payload, ...prev.filter((n) => n.id !== payload.id)] : [payload]
      );

      // Invalidate timeline feed so timeline stays in sync with notifications
      void queryClient.invalidateQueries({ queryKey: TIMELINE_KEY });

      // If tied to a specific job, invalidate that job's cache
      if (payload.relatedJobId) {
        void queryClient.invalidateQueries({ queryKey: jobKey(payload.relatedJobId) });
        void queryClient.invalidateQueries({ queryKey: JOBS_KEY });
      }
    }

    socket.on('notification', onNotification);

    return () => {
      socket.off('notification', onNotification);
      disconnectSocket();
    };
  }, [queryClient]);

  return children ? <>{children}</> : null;
}

