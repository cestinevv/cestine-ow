import { useNavigate } from '@tanstack/react-router';
import {
  type ReactElement,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import type { DramaPlayResponse } from '@/api/__generated__/story/model/dramaPlayResponse';
import type { NotificationItemResponse } from '@/api/__generated__/wallet/model/notificationItemResponse';
import { unwrapOrvalPayload } from '@/features/mining/miningFormat';
import { NotificationPanel } from '@/features/notification/components/NotificationPanel';
import {
  hasUnreadCount,
  NotificationEventType,
  NotificationTab,
  type NotificationTabValue,
  readNotificationDataId,
  readNotificationTargetType,
} from '@/features/notification/notificationFormat';
import {
  useNotificationReadMutation,
  useNotificationUnreadCount,
} from '@/features/notification/useNotificationData';
import { getPlayEpisodeDetailByEpisodeId } from '@/features/play/playDramaApi';
import { isGreaterThan, minus, plus, readSnowflakeId } from '@/utils';

type NotificationCenterRenderState = {
  hasUnread: boolean;
  onClose: () => void;
  onOpen: () => void;
  panel: ReactElement;
};

type NotificationCenterControllerProps = {
  active: boolean;
  children: (state: NotificationCenterRenderState) => ReactNode;
  isLogin: boolean;
  onRequestClose: () => void;
  unreadEnabled?: boolean;
};

function getVisibleUnreadCount(
  value: string | undefined,
  tab: NotificationTabValue,
  optimisticReadTabs: ReadonlySet<NotificationTabValue>,
  viewedNotifications: ReadonlyMap<string, NotificationTabValue>,
) {
  if (optimisticReadTabs.has(tab)) {
    return '0';
  }
  if (value === undefined) {
    return undefined;
  }

  let viewedCount = 0;
  for (const viewedTab of viewedNotifications.values()) {
    if (viewedTab === tab) {
      viewedCount += 1;
    }
  }
  const remainingCount = minus(value, viewedCount);
  return isGreaterThan(remainingCount, '0') ? remainingCount : '0';
}

/** 通知中心共享控制器：桌面 Popover 与移动子页复用同一数据和已读逻辑。 */
export function NotificationCenterController({
  active,
  children,
  isLogin,
  onRequestClose,
  unreadEnabled = true,
}: NotificationCenterControllerProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [retryingRead, setRetryingRead] = useState(false);
  const [optimisticReadTabs, setOptimisticReadTabs] = useState<
    ReadonlySet<NotificationTabValue>
  >(() => new Set());
  const [viewedNotifications, setViewedNotifications] = useState<
    ReadonlyMap<string, NotificationTabValue>
  >(() => new Map());
  const visitedTabsRef = useRef(new Set<NotificationTabValue>());
  const pendingReadTabsRef = useRef(new Set<NotificationTabValue>());
  const readInFlightTabsRef = useRef(new Set<NotificationTabValue>());
  const pendingRetryPromiseRef = useRef<Promise<void> | undefined>(undefined);
  const readSessionRef = useRef(0);
  const unreadQuery = useNotificationUnreadCount(isLogin && unreadEnabled);
  const { markTabsRead } = useNotificationReadMutation();
  const visibleSystemUnread = getVisibleUnreadCount(
    unreadQuery.data?.incomeUnread,
    NotificationTab.System,
    optimisticReadTabs,
    viewedNotifications,
  );
  const visibleInteractionUnread = getVisibleUnreadCount(
    unreadQuery.data?.interactionUnread,
    NotificationTab.Interaction,
    optimisticReadTabs,
    viewedNotifications,
  );
  const hasUnread =
    isLogin &&
    (hasUnreadCount(visibleSystemUnread) ||
      hasUnreadCount(visibleInteractionUnread));
  const visibleUnreadCounts = unreadQuery.data
    ? {
        ...unreadQuery.data,
        incomeUnread: visibleSystemUnread,
        interactionUnread: visibleInteractionUnread,
        totalUnread:
          visibleSystemUnread !== undefined &&
          visibleInteractionUnread !== undefined
            ? plus(visibleSystemUnread, visibleInteractionUnread)
            : undefined,
      }
    : undefined;

  useEffect(() => {
    if (isLogin) {
      return;
    }
    readSessionRef.current += 1;
    visitedTabsRef.current.clear();
    pendingReadTabsRef.current.clear();
    readInFlightTabsRef.current.clear();
    pendingRetryPromiseRef.current = undefined;
    setRetryingRead(false);
    setOptimisticReadTabs(new Set());
    setViewedNotifications(new Map());
  }, [isLogin]);

  const submitTabsRead = async (tabs: readonly NotificationTabValue[]) => {
    const availableTabs = tabs.filter(
      (tab) => !readInFlightTabsRef.current.has(tab),
    );
    if (availableTabs.length === 0) {
      return;
    }
    for (const tab of availableTabs) {
      readInFlightTabsRef.current.add(tab);
    }
    setOptimisticReadTabs((currentTabs) => {
      const nextTabs = new Set(currentTabs);
      for (const tab of availableTabs) {
        nextTabs.add(tab);
      }
      return nextTabs;
    });

    const readSession = readSessionRef.current;
    const { succeededTabs, failedTabs } = await markTabsRead(availableTabs);
    if (readSession !== readSessionRef.current) {
      return;
    }
    for (const tab of succeededTabs) {
      visitedTabsRef.current.delete(tab);
      pendingReadTabsRef.current.delete(tab);
    }
    for (const tab of failedTabs) {
      pendingReadTabsRef.current.add(tab);
    }
    for (const tab of availableTabs) {
      readInFlightTabsRef.current.delete(tab);
    }
    setOptimisticReadTabs((currentTabs) => {
      const nextTabs = new Set(currentTabs);
      for (const tab of availableTabs) {
        nextTabs.delete(tab);
      }
      return nextTabs;
    });
    setViewedNotifications((currentNotifications) => {
      const nextNotifications = new Map(currentNotifications);
      const submittedTabs = new Set(availableTabs);
      for (const [id, tab] of nextNotifications) {
        if (submittedTabs.has(tab)) {
          nextNotifications.delete(id);
        }
      }
      return nextNotifications;
    });
  };

  const flushVisitedTabs = async () => {
    const tabs = [
      ...new Set([...pendingReadTabsRef.current, ...visitedTabsRef.current]),
    ];
    if (tabs.length === 0) {
      return;
    }
    await submitTabsRead(tabs);
  };

  const retryPendingTabs = () => {
    if (pendingRetryPromiseRef.current) {
      return pendingRetryPromiseRef.current;
    }
    const tabs = [...pendingReadTabsRef.current];
    if (tabs.length === 0) {
      return Promise.resolve();
    }

    setRetryingRead(true);
    const retryPromise = submitTabsRead(tabs).finally(() => {
      pendingRetryPromiseRef.current = undefined;
      setRetryingRead(false);
    });
    pendingRetryPromiseRef.current = retryPromise;
    return retryPromise;
  };

  const handleOpen = () => {
    void retryPendingTabs();
    visitedTabsRef.current.add(NotificationTab.Interaction);
  };

  const handleClose = () => {
    void flushVisitedTabs();
  };

  const handleTabVisited = (tab: NotificationTabValue) => {
    visitedTabsRef.current.add(tab);
  };

  const handleNotificationViewed = (id: string, tab: NotificationTabValue) => {
    setViewedNotifications((currentNotifications) => {
      if (currentNotifications.has(id)) {
        return currentNotifications;
      }
      const nextNotifications = new Map(currentNotifications);
      nextNotifications.set(id, tab);
      return nextNotifications;
    });
  };

  const handleNotificationAction = async (item: NotificationItemResponse) => {
    if (item.eventType === NotificationEventType.StaminaLow) {
      void navigate({ to: '/game' });
    } else if (
      item.eventType === NotificationEventType.IpSign ||
      item.eventType === NotificationEventType.ShowReward
    ) {
      void navigate({ to: '/income' });
    } else if (
      item.eventType === NotificationEventType.Like ||
      item.eventType === NotificationEventType.Favorite ||
      item.eventType === NotificationEventType.Comment
    ) {
      const objectId = readNotificationDataId(item, 'objectId');
      const targetType = readNotificationTargetType(item);
      const commentId =
        item.eventType === NotificationEventType.Comment
          ? (readNotificationDataId(item, 'behaviorId') ??
            readNotificationDataId(item, 'commentId'))
          : undefined;
      if (
        !objectId ||
        !targetType ||
        (item.eventType === NotificationEventType.Comment && !commentId)
      ) {
        toast.error(t('加载失败'));
        return;
      }

      if (targetType === 'drama') {
        void navigate({
          to: '/play/$dramaId',
          params: { dramaId: objectId },
          search: commentId ? { commentId } : undefined,
        });
      } else {
        try {
          const response = await getPlayEpisodeDetailByEpisodeId(objectId);
          const detail = unwrapOrvalPayload<DramaPlayResponse>(response);
          const dramaId = readSnowflakeId(detail?.dramaId);
          const episodeNo = detail?.episodeNo;
          if (
            !dramaId ||
            typeof episodeNo !== 'number' ||
            !Number.isInteger(episodeNo) ||
            episodeNo < 1
          ) {
            toast.error(t('加载失败'));
            return;
          }

          void navigate({
            to: '/play/$dramaId',
            params: { dramaId },
            search: { episode: episodeNo, commentId },
          });
        } catch {
          toast.error(t('加载失败'));
          return;
        }
      }
    } else {
      return;
    }
    onRequestClose();
    void flushVisitedTabs();
  };

  return children({
    hasUnread,
    onClose: handleClose,
    onOpen: handleOpen,
    panel: (
      <NotificationPanel
        enabled={active && isLogin && !retryingRead}
        unreadCounts={visibleUnreadCounts}
        optimisticReadTabs={optimisticReadTabs}
        viewedNotifications={viewedNotifications}
        onNotificationAction={handleNotificationAction}
        onNotificationViewed={handleNotificationViewed}
        onTabVisited={handleTabVisited}
        onRequestClose={onRequestClose}
      />
    ),
  });
}
