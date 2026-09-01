import { useQueryClient } from '@tanstack/react-query';
import type { ConnectedContext } from 'centrifuge';
import { type ReactNode, useEffect, useRef, useState } from 'react';

import {
  getUnreadCountQueryKey,
  getUnreadCountQueryOptions,
} from '@/api/__generated__/wallet/notification/notification';
import { invalidateNotificationQueries } from '@/features/notification/notificationApi';
import { useCentrifugoSubscription } from '@/hooks/useCentrifugoSubscription';
import type { CentrifugoConnectedMeta } from '@/providers/CentrifugoProvider';
import { PersonalCentrifugoProvider } from '@/providers/PersonalCentrifugoProvider';
import useGlobalStore from '@/stores/global';

const NOTIFICATION_CHANNEL_PREFIX = 'personal:user:notification#';
const CACHE_SYNC_DELAY_MS = 500;

export function NotificationRealtimeProvider({
  children,
}: {
  children: ReactNode;
}) {
  const queryClient = useQueryClient();
  const isLogin = useGlobalStore((state) => state.isLogin);
  const userId = useGlobalStore((state) => state.userProfile?.userId);
  const [initializedUserId, setInitializedUserId] = useState<string>();

  useEffect(() => {
    setInitializedUserId(undefined);
    if (!isLogin || !userId) {
      return;
    }

    let disposed = false;
    void queryClient
      .fetchQuery({
        ...getUnreadCountQueryOptions(),
        retry: false,
      })
      .catch(() => undefined)
      .finally(() => {
        if (!disposed) {
          setInitializedUserId(userId);
        }
      });

    return () => {
      disposed = true;
    };
  }, [isLogin, queryClient, userId]);

  return (
    <PersonalCentrifugoProvider enabled={initializedUserId === userId}>
      {children}
      <NotificationRealtimeBridge />
    </PersonalCentrifugoProvider>
  );
}

export function NotificationRealtimeBridge() {
  const queryClient = useQueryClient();
  const isLogin = useGlobalStore((state) => state.isLogin);
  const userId = useGlobalStore((state) => state.userProfile?.userId);
  const cacheSyncTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const forceCacheSyncRef = useRef(false);
  const networkRestoredAtRef = useRef(0);
  const reconnectedAtRef = useRef(0);
  const realtimeEnabled = Boolean(isLogin && userId);

  useCentrifugoSubscription({
    channel: userId ? `${NOTIFICATION_CHANNEL_PREFIX}${userId}` : undefined,
    enabled: realtimeEnabled,
    onConnected: handleConnected,
    onPublication: handlePublication,
  });

  useEffect(() => {
    if (!isLogin || !userId) {
      return;
    }

    const handleOnline = () => {
      networkRestoredAtRef.current = Date.now();
    };
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('online', handleOnline);
      if (cacheSyncTimerRef.current !== undefined) {
        clearTimeout(cacheSyncTimerRef.current);
      }
      cacheSyncTimerRef.current = undefined;
      forceCacheSyncRef.current = false;
      networkRestoredAtRef.current = 0;
      reconnectedAtRef.current = 0;
    };
  }, [isLogin, userId]);

  function handleConnected(
    _context: ConnectedContext,
    { reconnected }: CentrifugoConnectedMeta,
  ) {
    if (!reconnected) {
      networkRestoredAtRef.current = 0;
      return;
    }

    reconnectedAtRef.current = Date.now();
    scheduleNotificationCacheSync(false);
  }

  function handlePublication() {
    scheduleNotificationCacheSync(true);
  }

  function scheduleNotificationCacheSync(force: boolean) {
    forceCacheSyncRef.current ||= force;
    if (cacheSyncTimerRef.current !== undefined) {
      clearTimeout(cacheSyncTimerRef.current);
    }

    cacheSyncTimerRef.current = setTimeout(() => {
      cacheSyncTimerRef.current = undefined;
      const mustSync = forceCacheSyncRef.current;
      forceCacheSyncRef.current = false;
      const unreadQueryState = queryClient.getQueryState(
        getUnreadCountQueryKey(),
      );
      const cacheSyncBoundary =
        networkRestoredAtRef.current || reconnectedAtRef.current;
      const syncedAfterReconnect =
        unreadQueryState?.fetchStatus === 'fetching' ||
        (cacheSyncBoundary > 0 &&
          (unreadQueryState?.dataUpdatedAt ?? 0) >= cacheSyncBoundary);

      networkRestoredAtRef.current = 0;
      reconnectedAtRef.current = 0;

      if (!mustSync && syncedAfterReconnect) {
        return;
      }
      void invalidateNotificationQueries(queryClient);
    }, CACHE_SYNC_DELAY_MS);
  }

  return null;
}
