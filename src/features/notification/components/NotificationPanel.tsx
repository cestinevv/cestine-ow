import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useInView } from 'react-intersection-observer';
import { toast } from 'sonner';

import type { NotificationItemResponse } from '@/api/__generated__/wallet/model/notificationItemResponse';
import type { NotificationUnreadCountResponse } from '@/api/__generated__/wallet/model/notificationUnreadCountResponse';
import IconCommentMore from '@/assets/svg/IconCommentMore';
import IconEarn from '@/assets/svg/IconEarn';
import AppLoadingContainer from '@/components/common/AppLoadingContainer';
import { UserProfileAvatarCircle } from '@/components/common/UserProfileAvatar';
import { UserProfileAvatarLink } from '@/components/common/UserProfileAvatarLink';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NOTIFICATION_PAGE_SIZE } from '@/features/notification/notificationApi';
import {
  getNotificationAvatarFallback,
  getTabUnreadCount,
  hasUnreadCount,
  isUnreadNotification,
  NotificationEventType,
  NotificationTab,
  type NotificationTabValue,
  readNotificationDataText,
  readNotificationFollowStatus,
  readNotificationTargetType,
} from '@/features/notification/notificationFormat';
import {
  useNotificationDeleteMutation,
  useNotificationFollowMutation,
  useNotificationInfiniteList,
} from '@/features/notification/useNotificationData';
import {
  getUserFollowAction,
  getUserFollowLabel,
  isUserFollowing,
  type UserFollowAction,
} from '@/features/profile/profileFollowStatus';
import { useProfileBlockInteractionGuard } from '@/features/profile/useProfileBlockInteractionGuard';
import {
  cn,
  formatDateFromMillisecond,
  formatDateFromNowMillisecond,
  formatNumber,
  readSnowflakeId,
} from '@/utils';

type NotificationPanelProps = {
  enabled: boolean;
  unreadCounts?: NotificationUnreadCountResponse;
  optimisticReadTabs: ReadonlySet<NotificationTabValue>;
  viewedNotifications: ReadonlyMap<string, NotificationTabValue>;
  onNotificationAction: (item: NotificationItemResponse) => void;
  onNotificationViewed: (id: string, tab: NotificationTabValue) => void;
  onTabVisited: (tab: NotificationTabValue) => void;
  onRequestClose: () => void;
};

const DELETE_LOADING_DELAY_MS = 300;
const DELETE_TOAST_ID = 'notification-delete';

function NotificationAvatar({
  item,
  unread,
  onRequestClose,
}: {
  item: NotificationItemResponse;
  unread: boolean;
  onRequestClose: () => void;
}) {
  const operateUserId = item.operateUserId?.trim();
  const ipAvatarUrl = readNotificationDataText(item, 'ipAvatarUrl');
  const isIpSign = item.eventType === NotificationEventType.IpSign;
  const unreadDot = unread ? (
    <span
      className="absolute -top-0.5 -left-0.5 z-10 size-1.5 rounded-full bg-destructive"
      aria-hidden
    />
  ) : null;

  if (
    item.eventType === NotificationEventType.ShowReward &&
    !operateUserId &&
    !ipAvatarUrl
  ) {
    return (
      <div className="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
        <IconEarn className="size-8 text-onestory-brand-red" />
        {unreadDot}
      </div>
    );
  }

  if (operateUserId && !isIpSign) {
    return (
      <div className="relative shrink-0">
        <UserProfileAvatarLink
          userId={operateUserId}
          onNavigate={onRequestClose}
        >
          <UserProfileAvatarCircle
            userId={operateUserId}
            avatarUrl={item.operateAvatarUrl}
            size={40}
            alt={item.operateNickname?.trim() || ''}
            fallbackChar={getNotificationAvatarFallback(item)}
            containerClassName="size-10"
          />
        </UserProfileAvatarLink>
        {unreadDot}
      </div>
    );
  }

  return (
    <Avatar size="lg">
      {ipAvatarUrl ? <AvatarImage src={ipAvatarUrl} alt="" /> : null}
      <AvatarFallback>{getNotificationAvatarFallback(item)}</AvatarFallback>
      {unreadDot}
    </Avatar>
  );
}

function NotificationBody({ item }: { item: NotificationItemResponse }) {
  const { t } = useTranslation();
  const nickname = item.operateNickname?.trim();
  const ipName = readNotificationDataText(item, 'ipName');
  const amount = readNotificationDataText(item, 'amount');
  const assetCode = readNotificationDataText(item, 'assetCode');
  const targetName = readNotificationDataText(item, 'targetName');
  const targetType = readNotificationTargetType(item);

  if (item.eventType === NotificationEventType.IpSign) {
    return (
      <>
        <p>
          {nickname ? `@${nickname} ` : null}
          {t('签约了角色IP')} {ipName ? <strong>{ipName}</strong> : null}
        </p>
        {amount ? (
          <p className="font-bold">
            {t('你获得分成')}{' '}
            <span className="text-play-rating-star">
              {formatNumber(amount)} {assetCode}
            </span>
          </p>
        ) : null}
      </>
    );
  }

  if (item.eventType === NotificationEventType.StaminaLow) {
    const stamina = readNotificationDataText(item, 'stamina');
    return (
      <>
        <p>
          {ipName ? <strong>{ipName}</strong> : null}{' '}
          {t('体力不足，尽快补充体力或休息')}
        </p>
        {stamina ? (
          <p className="font-bold">
            {t('当前体力')}{' '}
            <span className="text-destructive">{formatNumber(stamina)}</span>
          </p>
        ) : null}
      </>
    );
  }

  if (item.eventType === NotificationEventType.ShowReward) {
    const periodStart = readNotificationDataText(item, 'periodStart');
    const periodEnd = readNotificationDataText(item, 'periodEnd');
    return (
      <>
        {periodStart && periodEnd ? (
          <p>
            {formatDateFromMillisecond(periodStart, 'YYYY/M/D')} ～{' '}
            {formatDateFromMillisecond(periodEnd, 'YYYY/M/D')} {t('演出结束')}
          </p>
        ) : null}
        {amount ? (
          <p className="font-bold">
            {t('你获得收益')}{' '}
            <span className="text-play-rating-star">
              {formatNumber(amount)} {assetCode}
            </span>
          </p>
        ) : null}
      </>
    );
  }

  if (
    item.eventType === NotificationEventType.Like ||
    item.eventType === NotificationEventType.Favorite
  ) {
    const action =
      item.eventType === NotificationEventType.Like ? t('点赞了') : t('收藏了');
    const targetLabel = targetType === 'video' ? t('你的视频') : t('你的短剧');
    return (
      <p className="line-clamp-2 break-all">
        {action}
        {targetLabel}
        {targetName ? `《${targetName}》` : null}
      </p>
    );
  }

  if (item.eventType === NotificationEventType.Follow) {
    return <p className="line-clamp-2 break-all">{t('关注了你')}</p>;
  }

  return (
    <p className="line-clamp-2 break-all">
      {t('评论了你：')}
      {readNotificationDataText(item, 'content')}
    </p>
  );
}

export function NotificationPreviewItem({
  item,
}: {
  item: NotificationItemResponse;
}) {
  const operateUserId = item.operateUserId?.trim();
  const ipAvatarUrl = readNotificationDataText(item, 'ipAvatarUrl');
  const isIpSign = item.eventType === NotificationEventType.IpSign;
  const isReward =
    item.eventType === NotificationEventType.ShowReward &&
    !operateUserId &&
    !ipAvatarUrl;
  const unreadDot = isUnreadNotification(item) ? (
    <span
      className="absolute -top-0.5 -left-0.5 z-10 size-1.5 rounded-full bg-destructive"
      aria-hidden
    />
  ) : null;

  return (
    <article className="flex min-w-0 items-center gap-2">
      {isReward ? (
        <div className="relative flex size-8 shrink-0 items-center justify-center rounded-full bg-background">
          <IconEarn className="size-6 text-onestory-brand-red" />
          {unreadDot}
        </div>
      ) : operateUserId && !isIpSign ? (
        <div className="relative shrink-0">
          <UserProfileAvatarCircle
            userId={operateUserId}
            avatarUrl={item.operateAvatarUrl}
            size={32}
            alt={item.operateNickname?.trim() || ''}
            fallbackChar={getNotificationAvatarFallback(item)}
            containerClassName="size-8"
          />
          {unreadDot}
        </div>
      ) : (
        <div className="relative shrink-0">
          <Avatar size="default">
            {ipAvatarUrl ? <AvatarImage src={ipAvatarUrl} alt="" /> : null}
            <AvatarFallback>
              {getNotificationAvatarFallback(item)}
            </AvatarFallback>
          </Avatar>
          {unreadDot}
        </div>
      )}

      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <div className="min-w-0 flex-1 truncate whitespace-nowrap text-xs leading-4 text-foreground [&_p]:!inline">
          <NotificationBody item={item} />
        </div>
        {item.eventTime ? (
          <time className="ml-auto shrink-0 text-[11px] leading-4 text-muted-foreground">
            {formatDateFromNowMillisecond(item.eventTime)}
          </time>
        ) : null}
      </div>
    </article>
  );
}

function getNotificationLabel(item: NotificationItemResponse) {
  switch (item.eventType) {
    case NotificationEventType.IpSign:
      return '签约角色IP';
    case NotificationEventType.StaminaLow:
      return '角色管理';
    case NotificationEventType.ShowReward:
      return '演出收益';
    case NotificationEventType.Like:
      return '点赞';
    case NotificationEventType.Favorite:
      return '收藏';
    default:
      return '评论';
  }
}

function getNotificationAction(item: NotificationItemResponse) {
  if (item.eventType === NotificationEventType.StaminaLow) {
    return '补充';
  }
  if (
    item.eventType === NotificationEventType.IpSign ||
    item.eventType === NotificationEventType.ShowReward
  ) {
    return '领取';
  }
  return undefined;
}

type NotificationCardProps = {
  item: NotificationItemResponse;
  deleting: boolean;
  forceRead: boolean;
  onDelete: (id: string) => void;
  followPending: boolean;
  onAction: (item: NotificationItemResponse) => void | Promise<void>;
  onFollowToggle: (
    targetUserId: string,
    action: UserFollowAction,
  ) => void | Promise<void>;
  onViewed: (id: string) => void;
  onRequestClose: () => void;
};

function NotificationCard({
  item,
  deleting,
  forceRead,
  followPending,
  onDelete,
  onAction,
  onFollowToggle,
  onViewed,
  onRequestClose,
}: NotificationCardProps) {
  const { t } = useTranslation();
  const [actionPending, setActionPending] = useState(false);
  const action = getNotificationAction(item);
  const followStatus = readNotificationFollowStatus(item);
  const followAction = getUserFollowAction(followStatus);
  const followLabel = getUserFollowLabel(followStatus);
  const isFollowing = isUserFollowing(followStatus);
  const followTargetUserId =
    item.eventType === NotificationEventType.Follow
      ? readSnowflakeId(item.operateUserId)
      : undefined;
  const { guardBlockedInteraction } =
    useProfileBlockInteractionGuard(followTargetUserId);
  const coverUrl = readNotificationDataText(item, 'coverUrl');
  const operatorName = item.operateNickname?.trim();
  const isInteraction =
    item.eventType === NotificationEventType.Like ||
    item.eventType === NotificationEventType.Favorite ||
    item.eventType === NotificationEventType.Comment ||
    item.eventType === NotificationEventType.Follow;
  const opensTarget =
    item.eventType === NotificationEventType.Like ||
    item.eventType === NotificationEventType.Favorite ||
    item.eventType === NotificationEventType.Comment;
  const unread = isUnreadNotification(item) && !forceRead;

  const handleDelete = () => {
    if (item.id) {
      onDelete(item.id);
    }
  };

  const handleAction = async () => {
    setActionPending(true);
    try {
      await onAction(item);
    } finally {
      setActionPending(false);
    }
  };

  const handleFollowToggle = () => {
    if (!followTargetUserId || !followAction) {
      return;
    }

    if (!guardBlockedInteraction('follow')) {
      return;
    }

    void onFollowToggle(followTargetUserId, followAction);
  };

  const handleViewed = () => {
    if (unread && item.id) {
      onViewed(item.id);
    }
  };

  const operatorUserId = item.operateUserId?.trim();
  const operatorHeading =
    isInteraction && operatorName ? (
      <UserProfileAvatarLink
        userId={operatorUserId}
        onNavigate={onRequestClose}
        className="w-full max-w-full justify-start"
      >
        <p className="w-full truncate text-left text-[15px] leading-[22px] font-[510] text-foreground">
          {operatorName}
        </p>
      </UserProfileAvatarLink>
    ) : isInteraction ? null : (
      <span className="w-fit rounded-full bg-muted px-1.5 py-0.5 text-xs leading-4 text-foreground">
        {t(getNotificationLabel(item))}
      </span>
    );
  const notificationMeta = (
    <>
      <div className="min-w-0 overflow-hidden break-all text-[15px] leading-[22px] text-foreground">
        <NotificationBody item={item} />
      </div>
      {item.eventTime ? (
        <time className="text-xs leading-4 text-wallet-text-tertiary">
          {formatDateFromNowMillisecond(item.eventTime)}
        </time>
      ) : null}
    </>
  );

  return (
    <li
      className="flex w-full gap-3 rounded-xl p-2 hover:bg-muted/60"
      onPointerEnter={handleViewed}
      onPointerDown={handleViewed}
    >
      <div className="flex min-w-0 flex-1 items-start gap-2">
        <NotificationAvatar
          item={item}
          unread={unread}
          onRequestClose={onRequestClose}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          {operatorHeading}
          {opensTarget ? (
            <Button
              type="button"
              variant="ghost"
              disabled={actionPending}
              onClick={handleAction}
              className="h-auto min-w-0 w-full items-start justify-start p-0 text-left font-normal whitespace-normal hover:bg-transparent disabled:opacity-60"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                {notificationMeta}
              </div>
            </Button>
          ) : (
            notificationMeta
          )}
        </div>
      </div>

      <div className="flex shrink-0 self-stretch flex-col items-center justify-between">
        {followTargetUserId && followAction ? (
          <Button
            type="button"
            size="sm"
            variant={isFollowing ? 'secondary' : 'default'}
            disabled={followPending}
            onClick={handleFollowToggle}
            className={cn(
              'h-7 min-w-15 rounded-full px-3 text-[13px] leading-[18px] font-normal',
              isFollowing
                ? 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-muted-foreground'
                : 'bg-foreground text-background hover:bg-foreground/90 hover:text-background',
            )}
          >
            {followPending ? (
              <Spinner
                className={cn(
                  'size-3.5',
                  isFollowing ? 'text-muted-foreground' : 'text-background',
                )}
              />
            ) : (
              t(followLabel)
            )}
          </Button>
        ) : coverUrl && opensTarget ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={actionPending}
            onClick={handleAction}
            className="size-12 shrink-0 rounded p-0 disabled:opacity-60"
            aria-label={t('查看')}
          >
            <img
              src={coverUrl}
              alt=""
              className="size-12 rounded object-cover"
            />
          </Button>
        ) : coverUrl ? (
          <img
            src={coverUrl}
            alt=""
            className="size-12 shrink-0 rounded object-cover"
          />
        ) : action ? (
          <Button
            type="button"
            size="sm"
            disabled={actionPending}
            onClick={handleAction}
            className="h-7 rounded-full bg-foreground px-3 text-[13px] leading-[18px] font-normal text-background disabled:bg-foreground disabled:text-background"
          >
            {t(action)}
          </Button>
        ) : null}
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={!item.id || deleting}
            className="inline-flex size-6 cursor-pointer items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
            aria-label={t('更多')}
          >
            <IconCommentMore className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-28">
            <DropdownMenuItem
              variant="destructive"
              disabled={deleting}
              onClick={handleDelete}
              className="cursor-pointer"
            >
              {deleting ? t('删除中...') : t('删除')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );
}

export function NotificationPanel({
  enabled,
  unreadCounts,
  optimisticReadTabs,
  viewedNotifications,
  onNotificationAction,
  onNotificationViewed,
  onTabVisited,
  onRequestClose,
}: NotificationPanelProps) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<NotificationTabValue>(
    NotificationTab.Interaction,
  );
  const [deletingId, setDeletingId] = useState<string>();
  const filters = useMemo(
    () => ({ pageSize: NOTIFICATION_PAGE_SIZE, tab }),
    [tab],
  );
  const {
    notifications,
    isPending,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useNotificationInfiniteList(filters, enabled);
  const { deleteNotification, deletePending } = useNotificationDeleteMutation();
  const { toggleNotificationFollow, followPendingTargetUserId } =
    useNotificationFollowMutation();
  const { ref, inView } = useInView({ rootMargin: '80px' });
  const hasUnreadInCurrentList =
    !optimisticReadTabs.has(tab) &&
    notifications.some(
      (item) =>
        isUnreadNotification(item) &&
        (!item.id || !viewedNotifications.has(item.id)),
    );

  useEffect(() => {
    if (
      (!inView && notifications.length > 0) ||
      !hasNextPage ||
      isFetchingNextPage
    ) {
      return;
    }
    void fetchNextPage();
  }, [
    fetchNextPage,
    hasNextPage,
    inView,
    isFetchingNextPage,
    notifications.length,
  ]);

  const handleTabChange = (value: string) => {
    const nextTab =
      value === String(NotificationTab.Interaction)
        ? NotificationTab.Interaction
        : NotificationTab.System;
    setTab(nextTab);
    onTabVisited(nextTab);
  };

  const handleNotificationViewed = (id: string) => {
    onNotificationViewed(id, tab);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const loadingTimer = setTimeout(() => {
      toast.loading(t('删除中...'), { id: DELETE_TOAST_ID });
    }, DELETE_LOADING_DELAY_MS);
    try {
      await deleteNotification(id);
      clearTimeout(loadingTimer);
      toast.success(t('删除成功'), { id: DELETE_TOAST_ID });
    } catch {
      clearTimeout(loadingTimer);
      toast.error(t('删除失败，请重试'), { id: DELETE_TOAST_ID });
    } finally {
      setDeletingId(undefined);
    }
  };

  const handleFollowToggle = async (
    targetUserId: string,
    action: UserFollowAction,
  ) => {
    try {
      await toggleNotificationFollow({ targetUserId, action });
    } catch {
      toast.error(t('网络不稳定，请稍后重试'));
    }
  };

  const hasTabUnread = (targetTab: NotificationTabValue) =>
    hasUnreadCount(getTabUnreadCount(unreadCounts, targetTab)) ||
    (targetTab === tab && hasUnreadInCurrentList);

  return (
    <Tabs
      value={String(tab)}
      onValueChange={handleTabChange}
      className="h-full min-h-0 gap-2"
    >
      <TabsList
        variant="line"
        className="h-12 w-full shrink-0 gap-5 border-b border-border px-4 pt-1.5"
      >
        <TabsTrigger
          value={String(NotificationTab.Interaction)}
          className="h-full"
        >
          <span className="relative">
            {t('互动')}
            {hasTabUnread(NotificationTab.Interaction) ? (
              <span
                className="absolute -top-1 -right-2 size-1.5 rounded-full bg-destructive"
                aria-hidden
              />
            ) : null}
          </span>
        </TabsTrigger>
        <TabsTrigger value={String(NotificationTab.System)} className="h-full">
          <span className="relative">
            {t('系统')}
            {hasTabUnread(NotificationTab.System) ? (
              <span
                className="absolute -top-1 -right-2 size-1.5 rounded-full bg-destructive"
                aria-hidden
              />
            ) : null}
          </span>
        </TabsTrigger>
      </TabsList>

      <TabsContent
        value={String(tab)}
        className="flex min-h-0 flex-col overflow-hidden"
      >
        <ScrollArea className="min-h-0 flex-1">
          <AppLoadingContainer
            data={notifications}
            isLoading={isPending}
            isError={isError}
            minHeight="100%"
            scrollable={false}
            emptyDescription={t('暂无通知')}
          >
            <ul
              className={cn(
                'flex flex-col',
                tab === NotificationTab.System ? 'gap-6 p-4' : 'gap-2 p-3',
              )}
            >
              {notifications.map((item, index) => (
                <NotificationCard
                  key={
                    item.id ?? `${item.eventType}-${item.eventTime}-${index}`
                  }
                  item={item}
                  deleting={deletePending && deletingId === item.id}
                  followPending={
                    followPendingTargetUserId ===
                    readSnowflakeId(item.operateUserId)
                  }
                  forceRead={
                    optimisticReadTabs.has(tab) ||
                    (item.id ? viewedNotifications.has(item.id) : false)
                  }
                  onDelete={handleDelete}
                  onAction={onNotificationAction}
                  onFollowToggle={handleFollowToggle}
                  onViewed={handleNotificationViewed}
                  onRequestClose={onRequestClose}
                />
              ))}
              <li ref={ref} className="h-px" aria-hidden />
              {isFetchingNextPage ? (
                <li className="py-2 text-center text-xs text-muted-foreground">
                  {t('加载中')}
                </li>
              ) : null}
            </ul>
          </AppLoadingContainer>
        </ScrollArea>
      </TabsContent>
    </Tabs>
  );
}
