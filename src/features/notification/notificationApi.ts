import type { QueryClient } from '@tanstack/react-query';

import type { ListParams } from '@/api/__generated__/wallet/model/listParams';
import {
  getListQueryKey,
  getUnreadCountQueryKey,
  list,
} from '@/api/__generated__/wallet/notification/notification';
import type { NotificationTabValue } from '@/features/notification/notificationFormat';

export const NOTIFICATION_PAGE_SIZE = 20;
export const NOTIFICATION_PREVIEW_SIZE = 3;

export type NotificationListFilters = {
  tab?: NotificationTabValue;
  eventType?: string;
  pageSize: number;
};

function adaptNotificationListParams(
  filters: NotificationListFilters,
  mark: string,
): ListParams {
  return {
    ...filters,
    // OpenAPI 暂将游标误标为 int64；运行时必须原样传字符串。
    mark: mark as unknown as number,
  };
}

export function getNotificationInfiniteListQueryKey(
  filters: NotificationListFilters,
) {
  return [...getListQueryKey(filters), 'infinite'] as const;
}

export function getNotificationPreviewQueryKey() {
  return getListQueryKey({
    mark: '0' as unknown as number,
    pageSize: NOTIFICATION_PREVIEW_SIZE,
  });
}

export function listNotifications(
  filters: NotificationListFilters,
  mark: string,
  options?: RequestInit,
) {
  return list(adaptNotificationListParams(filters, mark), options);
}

export function invalidateNotificationQueries(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({
      queryKey: getUnreadCountQueryKey(),
    }),
    queryClient.invalidateQueries({
      queryKey: getListQueryKey(),
    }),
  ]);
}
