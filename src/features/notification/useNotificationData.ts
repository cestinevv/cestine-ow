import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useMemo } from 'react';

import type { CursorPageResponseNotificationItemResponse } from '@/api/__generated__/wallet/model/cursorPageResponseNotificationItemResponse';
import type { NotificationItemResponse } from '@/api/__generated__/wallet/model/notificationItemResponse';
import type { NotificationUnreadCountResponse } from '@/api/__generated__/wallet/model/notificationUnreadCountResponse';
import {
  getListQueryKey,
  useDelete,
  useList,
  useRead,
  useUnreadCount,
} from '@/api/__generated__/wallet/notification/notification';
import { unwrapOrvalPayload } from '@/features/mining/miningFormat';
import {
  getNotificationInfiniteListQueryKey,
  getNotificationPreviewQueryKey,
  invalidateNotificationQueries,
  listNotifications,
  NOTIFICATION_PAGE_SIZE,
  NOTIFICATION_PREVIEW_SIZE,
  type NotificationListFilters,
} from '@/features/notification/notificationApi';
import {
  getNotificationNextPageParam,
  isSupportedNotification,
  markNotificationTabReadInCache,
  mergeNotificationPages,
  type NotificationTabValue,
  removeNotificationFromCache,
  updateNotificationFollowStatusInCache,
} from '@/features/notification/notificationFormat';
import type { UserFollowAction } from '@/features/profile/profileFollowStatus';
import {
  getProfileFollowStatsQueryKey,
  getProfileOtherUserInfoQueryKey,
  requestProfileFollow,
  requestProfileUnfollow,
} from '@/features/profile/profileWalletApi';
import useGlobalStore from '@/stores/global';
import { readSnowflakeId } from '@/utils';

export function useNotificationUnreadCount(enabled: boolean) {
  return useUnreadCount<NotificationUnreadCountResponse | undefined>({
    query: {
      enabled,
      select: (response) =>
        unwrapOrvalPayload<NotificationUnreadCountResponse>(response) ??
        undefined,
      retry: false,
    },
  });
}

export function useNotificationInfiniteList(
  filters: NotificationListFilters,
  enabled: boolean,
) {
  const query = useInfiniteQuery({
    queryKey: getNotificationInfiniteListQueryKey(filters),
    queryFn: ({ pageParam, signal }) =>
      listNotifications(filters, pageParam, { signal }),
    initialPageParam: '0',
    getNextPageParam: getNotificationNextPageParam,
    enabled,
    retry: false,
  });

  const notifications = useMemo(
    () => mergeNotificationPages(query.data),
    [query.data],
  );

  return { ...query, notifications };
}

export function useNotificationPreview(enabled: boolean) {
  return useList<NotificationItemResponse[]>(
    {
      mark: '0' as unknown as number,
      pageSize: NOTIFICATION_PREVIEW_SIZE,
    },
    {
      query: {
        queryKey: getNotificationPreviewQueryKey(),
        enabled,
        select: (response) => {
          const payload =
            unwrapOrvalPayload<CursorPageResponseNotificationItemResponse>(
              response,
            );
          return (payload?.list ?? [])
            .filter(isSupportedNotification)
            .slice(0, NOTIFICATION_PREVIEW_SIZE);
        },
        retry: false,
      },
    },
  );
}

export function useNotificationReadMutation() {
  const queryClient = useQueryClient();
  const readMutation = useRead();
  const markTabsRead = async (tabs: readonly NotificationTabValue[]) => {
    const results = await Promise.allSettled(
      tabs.map((tab) => readMutation.mutateAsync({ data: { tab } })),
    );
    const succeededTabs: NotificationTabValue[] = [];
    const failedTabs: NotificationTabValue[] = [];
    for (const [index, result] of results.entries()) {
      const tab = tabs[index];
      if (tab === undefined) {
        continue;
      }
      if (result.status === 'fulfilled') {
        succeededTabs.push(tab);
      } else {
        failedTabs.push(tab);
      }
    }
    for (const tab of succeededTabs) {
      queryClient.setQueryData(
        getNotificationInfiniteListQueryKey({
          pageSize: NOTIFICATION_PAGE_SIZE,
          tab,
        }),
        (cache) => markNotificationTabReadInCache(cache, tab),
      );
    }
    if (succeededTabs.length > 0) {
      await invalidateNotificationQueries(queryClient);
    }

    return { succeededTabs, failedTabs };
  };

  return {
    markTabsRead,
  };
}

export function useNotificationDeleteMutation() {
  const queryClient = useQueryClient();
  const deleteMutation = useDelete();

  const deleteNotification = async (id: string) => {
    await deleteMutation.mutateAsync({
      data: {
        // OpenAPI 暂将雪花 ID 误标为 int64；运行时必须保持字符串。
        id: id as unknown as number,
      },
    });
    queryClient.setQueriesData({ queryKey: getListQueryKey() }, (cache) =>
      removeNotificationFromCache(cache, id),
    );
    void invalidateNotificationQueries(queryClient);
  };

  return {
    deleteNotification,
    deletePending: deleteMutation.isPending,
  };
}

export function useNotificationFollowMutation() {
  const queryClient = useQueryClient();
  const currentUserId = useGlobalStore((state) =>
    readSnowflakeId(state.userProfile?.userId),
  );
  const followMutation = useMutation({
    mutationFn: ({
      targetUserId,
      action,
    }: {
      targetUserId: string;
      action: UserFollowAction;
    }) =>
      action === 'follow'
        ? requestProfileFollow(targetUserId)
        : requestProfileUnfollow(targetUserId),
    onSuccess: async (_data, { targetUserId, action }) => {
      queryClient.setQueriesData({ queryKey: getListQueryKey() }, (cache) =>
        updateNotificationFollowStatusInCache(cache, targetUserId, action),
      );
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: getProfileOtherUserInfoQueryKey(targetUserId),
        }),
        queryClient.invalidateQueries({
          queryKey: getProfileFollowStatsQueryKey(targetUserId),
        }),
        queryClient.invalidateQueries({
          queryKey: ['/api/userWallet/users/follow-list'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['/api/userWallet/user/search'],
        }),
        currentUserId
          ? queryClient.invalidateQueries({
              queryKey: getProfileFollowStatsQueryKey(currentUserId),
            })
          : Promise.resolve(),
      ]);
    },
  });

  return {
    toggleNotificationFollow: followMutation.mutateAsync,
    followPendingTargetUserId: followMutation.isPending
      ? followMutation.variables?.targetUserId
      : undefined,
  };
}
