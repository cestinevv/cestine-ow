import type { InfiniteData } from '@tanstack/react-query';

import type { NotificationItemResponse } from '@/api/__generated__/wallet/model/notificationItemResponse';
import type { NotificationItemResponseData } from '@/api/__generated__/wallet/model/notificationItemResponseData';
import type { NotificationUnreadCountResponse } from '@/api/__generated__/wallet/model/notificationUnreadCountResponse';
import type { listResponse } from '@/api/__generated__/wallet/notification/notification';
import { unwrapOrvalPayload } from '@/features/mining/miningFormat';
import {
  getUserNextFollowStatus,
  parseUserFollowStatus,
  type UserFollowAction,
} from '@/features/profile/profileFollowStatus';
import { isGreaterThan, readSnowflakeId } from '@/utils';

export const NotificationTab = {
  System: 1,
  Interaction: 2,
} as const;

export type NotificationTabValue =
  (typeof NotificationTab)[keyof typeof NotificationTab];

export const NotificationEventType = {
  IpSign: 'IP_SIGN',
  ShowReward: 'SHOW_REWARD',
  StaminaLow: 'STAMINA_LOW',
  Like: 'LIKE',
  Favorite: 'FAVORITE',
  Comment: 'COMMENT',
  Follow: 'FOLLOW',
} as const;

export type NotificationEventTypeValue =
  (typeof NotificationEventType)[keyof typeof NotificationEventType];

export type NotificationTargetType = 'video' | 'drama';

type NotificationDataRecord = Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function removeNotificationFromList(value: unknown, id: string) {
  if (!Array.isArray(value)) {
    return value;
  }

  return value.filter((item) => !isRecord(item) || item.id !== id);
}

export function removeNotificationFromCache(cache: unknown, id: string) {
  if (Array.isArray(cache)) {
    return removeNotificationFromList(cache, id);
  }
  if (!isRecord(cache) || !Array.isArray(cache.pages)) {
    return cache;
  }

  return {
    ...cache,
    pages: cache.pages.map((page) => {
      if (!isRecord(page) || !isRecord(page.data)) {
        return page;
      }
      const payload = page.data.data;
      if (!isRecord(payload)) {
        return page;
      }

      return {
        ...page,
        data: {
          ...page.data,
          data: {
            ...payload,
            list: removeNotificationFromList(payload.list, id),
          },
        },
      };
    }),
  };
}

export function markNotificationTabReadInCache(
  cache: unknown,
  tab: NotificationTabValue,
) {
  if (!isRecord(cache) || !Array.isArray(cache.pages)) {
    return cache;
  }

  return {
    ...cache,
    pages: cache.pages.map((page) => {
      if (!isRecord(page) || !isRecord(page.data)) {
        return page;
      }
      const payload = page.data.data;
      if (!isRecord(payload) || !Array.isArray(payload.list)) {
        return page;
      }

      return {
        ...page,
        data: {
          ...page.data,
          data: {
            ...payload,
            list: payload.list.map((item) =>
              isRecord(item) && item.tab === tab && item.isRead === 0
                ? { ...item, isRead: 1 }
                : item,
            ),
          },
        },
      };
    }),
  };
}

export function readNotificationData(
  item: NotificationItemResponse,
): NotificationDataRecord {
  if (!item.data || typeof item.data !== 'object' || Array.isArray(item.data)) {
    return {};
  }

  return item.data as unknown as NotificationDataRecord;
}

export function readNotificationDataText(
  item: NotificationItemResponse,
  key: string,
): string | undefined {
  const value = readNotificationData(item)[key];

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return undefined;
}

export function readNotificationDataId(
  item: NotificationItemResponse,
  key: string,
): string | undefined {
  const value = readNotificationData(item)[key];

  if (typeof value !== 'string' && typeof value !== 'number') {
    return undefined;
  }

  return readSnowflakeId(value);
}

export function readNotificationTargetType(
  item: NotificationItemResponse,
): NotificationTargetType | undefined {
  const targetType = readNotificationDataText(item, 'targetType');
  return targetType === 'video' || targetType === 'drama'
    ? targetType
    : undefined;
}

export function readNotificationFollowStatus(item: NotificationItemResponse) {
  return parseUserFollowStatus(readNotificationDataText(item, 'followStatus'));
}

function updateNotificationFollowItem(
  item: NotificationItemResponse,
  targetUserId: string,
  action: UserFollowAction,
) {
  if (
    item.eventType !== NotificationEventType.Follow ||
    readSnowflakeId(item.operateUserId) !== targetUserId
  ) {
    return item;
  }

  const followStatus = getUserNextFollowStatus(
    readNotificationDataText(item, 'followStatus'),
    action,
  );
  if (!followStatus) {
    return item;
  }

  return {
    ...item,
    data: {
      ...readNotificationData(item),
      followStatus,
    } as unknown as NotificationItemResponseData,
  };
}

function updateNotificationResponseFollowStatus(
  response: unknown,
  targetUserId: string,
  action: UserFollowAction,
) {
  if (!isRecord(response) || !isRecord(response.data)) {
    return response;
  }
  const payload = response.data.data;
  if (!isRecord(payload) || !Array.isArray(payload.list)) {
    return response;
  }

  return {
    ...response,
    data: {
      ...response.data,
      data: {
        ...payload,
        list: payload.list.map((item) =>
          isRecord(item)
            ? updateNotificationFollowItem(
                item as NotificationItemResponse,
                targetUserId,
                action,
              )
            : item,
        ),
      },
    },
  };
}

export function updateNotificationFollowStatusInCache(
  cache: unknown,
  targetUserId: string,
  action: UserFollowAction,
) {
  if (Array.isArray(cache)) {
    return cache.map((item) =>
      isRecord(item)
        ? updateNotificationFollowItem(
            item as NotificationItemResponse,
            targetUserId,
            action,
          )
        : item,
    );
  }
  if (isRecord(cache) && Array.isArray(cache.pages)) {
    return {
      ...cache,
      pages: cache.pages.map((page) =>
        updateNotificationResponseFollowStatus(page, targetUserId, action),
      ),
    };
  }
  return updateNotificationResponseFollowStatus(cache, targetUserId, action);
}

export function isSupportedNotification(
  item: NotificationItemResponse,
): item is NotificationItemResponse & {
  eventType: NotificationEventTypeValue;
} {
  return Object.values(NotificationEventType).includes(
    item.eventType as NotificationEventTypeValue,
  );
}

export function isUnreadNotification(item: NotificationItemResponse) {
  return item.isRead === 0;
}

export function hasUnreadCount(value: string | undefined) {
  if (value === undefined) {
    return false;
  }

  return isGreaterThan(value, '0');
}

export function getTabUnreadCount(
  counts: NotificationUnreadCountResponse | undefined,
  tab: NotificationTabValue,
) {
  return tab === NotificationTab.System
    ? counts?.incomeUnread
    : counts?.interactionUnread;
}

export function mergeNotificationPages(
  data: InfiniteData<listResponse, unknown> | undefined,
) {
  if (!data?.pages.length) {
    return [];
  }

  const notifications: NotificationItemResponse[] = [];
  const notificationIds = new Set<string>();
  for (const page of data.pages) {
    const payload = unwrapOrvalPayload<{
      list?: NotificationItemResponse[];
    }>(page);

    for (const item of payload?.list ?? []) {
      if (!isSupportedNotification(item)) {
        continue;
      }
      if (item.id && notificationIds.has(item.id)) {
        continue;
      }
      if (item.id) {
        notificationIds.add(item.id);
      }
      notifications.push(item);
    }
  }

  return notifications;
}

export function getNotificationNextPageParam(lastPage: listResponse) {
  const payload = unwrapOrvalPayload<{
    hasMore?: boolean;
    mark?: string;
  }>(lastPage);

  if (!payload?.hasMore || !payload.mark || payload.mark === '-1') {
    return undefined;
  }

  return payload.mark;
}

export function getNotificationAvatarFallback(item: NotificationItemResponse) {
  if (item.eventType === NotificationEventType.IpSign) {
    return readNotificationDataText(item, 'ipName')?.slice(0, 1).toUpperCase();
  }

  return (
    item.operateNickname?.trim().slice(0, 1).toUpperCase() ||
    readNotificationDataText(item, 'ipName')?.slice(0, 1).toUpperCase()
  );
}
