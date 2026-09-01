import {
  type InfiniteData,
  type QueryClient,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useNavigate, useRouter } from '@tanstack/react-router';
import { type UIEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import type { CursorPageResponseFollowListItemResponse } from '@/api/__generated__/wallet/model/cursorPageResponseFollowListItemResponse';
import type { FollowListItemResponse } from '@/api/__generated__/wallet/model/followListItemResponse';
import type { FollowListItemResponseRelationStatus as RelationStatus } from '@/api/__generated__/wallet/model/followListItemResponseRelationStatus';
import emptyAvatarBgUrl from '@/assets/figma/profile-follow/empty-avatar-bg.svg';
import emptyAvatarDarkUrl from '@/assets/figma/profile-follow/empty-avatar-dark.svg';
import emptyAvatarUserUrl from '@/assets/figma/profile-follow/empty-avatar-user.svg';
import userMinusUrl from '@/assets/figma/profile-follow/user-minus.svg';
import IconX from '@/assets/svg/IconX';
import AppLoadingContainer from '@/components/common/AppLoadingContainer';
import { APP_DIALOG_PRIMARY_FULL_WIDTH_BUTTON_CLASS } from '@/components/common/appDialogButton';
import { UserProfileAvatarCircle } from '@/components/common/UserProfileAvatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import {
  getProfileFollowNextPageParam,
  getProfileFollowRelationActionLabel,
  getProfileFollowRelationStatusAfterFollow,
  getProfileFollowRelationStatusAfterUnfollow,
  getProfileFollowRows,
  PROFILE_FOLLOW_DIALOG_BODY_HEIGHT,
  PROFILE_FOLLOW_DIALOG_BODY_HEIGHT_CLASS,
  PROFILE_FOLLOW_DIALOG_CONTENT_MAX_HEIGHT_CLASS,
  PROFILE_FOLLOW_PAGE_SIZE,
  type ProfileFollowRelationTab,
  shouldFetchProfileFollowNextPage,
  updateProfileFollowRelationItems,
} from '@/features/profile/profileFollowRelations';
import {
  fetchProfileFollowList,
  getProfileFollowListQueryKey,
  getProfileFollowStatsQueryKey,
  requestProfileFollow,
  requestProfileRemoveFollower,
  requestProfileUnfollow,
} from '@/features/profile/profileWalletApi';
import { openRouteInNewTab } from '@/routing/newTabRouteLink';
import { cn } from '@/utils';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  initialTab: ProfileFollowRelationTab;
};

type PendingUnfollowTarget = {
  userId: string;
  nickname: string;
  nextStatus: RelationStatus;
};

const TABS: { value: ProfileFollowRelationTab; labelKey: string }[] = [
  { value: 'following', labelKey: '关注' },
  { value: 'followers', labelKey: '粉丝' },
  { value: 'mutuals', labelKey: '互关' },
];

const LIST_KIND_BY_TAB = {
  following: 'followings',
  followers: 'followers',
  mutuals: 'mutuals',
} as const;

type ProfileFollowListKind =
  (typeof LIST_KIND_BY_TAB)[ProfileFollowRelationTab];

const LIST_KINDS = Object.values(LIST_KIND_BY_TAB);

const DEFAULT_LIST_CACHE_VERSIONS: Record<ProfileFollowListKind, number> = {
  followings: 0,
  followers: 0,
  mutuals: 0,
};

function removeProfileFollowListQueries({
  queryClient,
  userId,
  kinds,
}: {
  queryClient: QueryClient;
  userId: string;
  kinds: readonly ProfileFollowListKind[];
}) {
  kinds.forEach((kind) => {
    queryClient.removeQueries({
      queryKey: getProfileFollowListQueryKey(userId, kind),
    });
  });
}

function getDisplayName(item: FollowListItemResponse, fallback: string) {
  return item.nickname?.trim() || fallback;
}

function getDisplayProfile(item: FollowListItemResponse) {
  return item.profile?.trim() || '';
}

function getPrimaryButtonTone(labelKey: string) {
  if (labelKey === '关注' || labelKey === '回关') {
    return 'dark';
  }

  return 'secondary';
}

function updateProfileFollowInfiniteData(
  data: InfiniteData<CursorPageResponseFollowListItemResponse> | undefined,
  targetUserId: string,
  nextStatus: RelationStatus | 'remove',
) {
  if (!data) {
    return data;
  }

  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      list: updateProfileFollowRelationItems(
        page.list ?? [],
        targetUserId,
        nextStatus,
      ),
    })),
  };
}

function getEmptyCopy(tab: ProfileFollowRelationTab) {
  if (tab === 'following') {
    return {
      descriptionKey: '暂无关注，去发现有趣的创作者吧～',
      actionKey: '去看看',
    };
  }

  if (tab === 'followers') {
    return {
      descriptionKey: '暂无粉丝，去发布作品提升曝光吧～',
      actionKey: '去发布',
    };
  }

  return {
    descriptionKey: '暂无互关好友',
    actionKey: undefined,
  };
}

function ProfileFollowEmptyState({
  tab,
  onAction,
}: {
  tab: ProfileFollowRelationTab;
  onAction: () => void;
}) {
  const { t } = useTranslation();
  const copy = getEmptyCopy(tab);

  return (
    <div
      className={cn(
        'flex w-full flex-1 flex-col items-center justify-center gap-6 rounded-xl p-3',
        PROFILE_FOLLOW_DIALOG_BODY_HEIGHT_CLASS,
      )}
    >
      <div className="flex w-full flex-col items-center gap-3">
        <div className="relative size-14 shrink-0 [[data-theme=dark]_&]:hidden">
          <img
            src={emptyAvatarBgUrl}
            alt=""
            className="absolute inset-0 size-full"
            aria-hidden
          />
          <img
            src={emptyAvatarUserUrl}
            alt=""
            className="absolute inset-[18.63%_22.55%_18.64%_22.54%]"
            aria-hidden
          />
        </div>
        <img
          src={emptyAvatarDarkUrl}
          alt=""
          className="hidden size-14 shrink-0 [[data-theme=dark]_&]:block"
          aria-hidden
        />
        <p className="w-full text-center text-sm leading-5 text-muted-foreground">
          {t(copy.descriptionKey)}
        </p>
      </div>

      {copy.actionKey ? (
        <Button
          type="button"
          onClick={onAction}
          className="h-11 rounded-xl bg-foreground px-4 py-2.5 text-sm leading-5 font-normal text-background hover:bg-foreground/90"
        >
          {t(copy.actionKey)}
        </Button>
      ) : (
        <div className="h-11 opacity-0" aria-hidden />
      )}
    </div>
  );
}

function ProfileRelationTabs({
  activeTab,
  onChange,
  onClose,
}: {
  activeTab: ProfileFollowRelationTab;
  onChange: (tab: ProfileFollowRelationTab) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex w-full items-start justify-between">
      <div className="flex items-center gap-5 pt-2.5">
        {TABS.map((tab) => {
          const active = tab.value === activeTab;

          return (
            <Button
              key={tab.value}
              type="button"
              variant="ghost"
              onClick={() => onChange(tab.value)}
              className={cn(
                'h-auto flex-col items-center border-0 bg-transparent p-0',
                'text-base leading-6 tracking-normal',
                'shadow-none hover:bg-transparent hover:shadow-none active:translate-y-0',
                active
                  ? 'font-bold text-foreground'
                  : 'font-normal text-muted-foreground hover:text-foreground',
              )}
            >
              <span className="pb-[5px]">{t(tab.labelKey)}</span>
              <span
                className={cn(
                  'h-[3px] w-4 rounded-[17px] bg-foreground',
                  active ? 'opacity-100' : 'opacity-0',
                )}
              />
            </Button>
          );
        })}
      </div>

      <DialogClose
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-6 rounded-full p-0"
            aria-label={t('关闭')}
            onClick={onClose}
          />
        }
      >
        <IconX className="size-6 text-foreground" />
      </DialogClose>
    </div>
  );
}

function ProfileFollowStatusState({
  isLoading,
  isError,
}: {
  isLoading: boolean;
  isError: boolean;
}) {
  return (
    <AppLoadingContainer
      data={[]}
      isLoading={isLoading}
      isError={isError}
      minHeight={PROFILE_FOLLOW_DIALOG_BODY_HEIGHT}
      maxHeight={PROFILE_FOLLOW_DIALOG_BODY_HEIGHT}
      scrollable={false}
    >
      <div />
    </AppLoadingContainer>
  );
}

function ProfileFollowRow({
  item,
  tab,
  isPrimaryPending,
  isRemovePending,
  onNavigate,
  onFollow,
  onUnfollow,
  onRemoveFollower,
}: {
  item: FollowListItemResponse;
  tab: ProfileFollowRelationTab;
  isPrimaryPending: boolean;
  isRemovePending: boolean;
  onNavigate: (item: FollowListItemResponse) => void;
  onFollow: (item: FollowListItemResponse) => void;
  onUnfollow: (item: FollowListItemResponse) => void;
  onRemoveFollower: (item: FollowListItemResponse) => void;
}) {
  const { t } = useTranslation();
  const displayName = getDisplayName(item, '--');
  const profile = getDisplayProfile(item);
  const actionLabel = getProfileFollowRelationActionLabel(item.relationStatus);
  const primaryTone = getPrimaryButtonTone(actionLabel);

  function handlePrimaryClick() {
    if (actionLabel === '已关注' || actionLabel === '互相关注') {
      onUnfollow(item);
      return;
    }

    onFollow(item);
  }

  return (
    <li className="flex w-full items-center gap-2">
      <button
        type="button"
        onClick={() => onNavigate(item)}
        className="flex min-w-0 flex-1 items-center gap-2 border-0 bg-transparent p-0 text-left"
      >
        <UserProfileAvatarCircle
          userId={item.userId}
          avatarUrl={item.avatarUrl}
          size={48}
          alt={displayName}
          fallbackChar={displayName[0]}
          containerClassName="size-12"
          className="size-full"
        />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate text-base leading-6 font-bold text-foreground">
            {displayName}
          </span>
          <span className="truncate text-xs leading-4 font-medium text-muted-foreground">
            {profile}
          </span>
        </span>
      </button>

      {tab !== 'mutuals' ? (
        <div className="flex shrink-0 items-center justify-end gap-2">
          <Button
            type="button"
            disabled={isPrimaryPending}
            onClick={handlePrimaryClick}
            className={cn(
              'h-8 gap-1 rounded-xl px-3 py-[5px] text-[13px] leading-[18px] font-bold',
              primaryTone === 'dark'
                ? 'bg-foreground text-background hover:bg-foreground/90'
                : 'bg-muted text-foreground hover:bg-muted/80',
            )}
          >
            {isPrimaryPending ? <Spinner className="size-3.5" /> : null}
            {t(actionLabel)}
          </Button>

          {tab === 'followers' ? (
            <Button
              type="button"
              variant="outline"
              disabled={isRemovePending}
              onClick={() => onRemoveFollower(item)}
              className="h-8 gap-1 rounded-xl border-border bg-background px-3 py-[5px] text-[13px] leading-[18px] font-bold text-foreground hover:bg-muted"
            >
              {isRemovePending ? <Spinner className="size-3.5" /> : null}
              {t('移除')}
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="h-8 w-[63px] shrink-0" aria-hidden />
      )}
    </li>
  );
}

function UnfollowConfirmDialog({
  target,
  isPending,
  onCancel,
  onConfirm,
}: {
  target?: PendingUnfollowTarget;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Dialog
      open={Boolean(target)}
      onOpenChange={(nextOpen) => !nextOpen && onCancel()}
    >
      <DialogContent
        bare
        bodyScroll={false}
        className="w-full gap-0 rounded-2xl border-0 bg-card p-0 md:max-w-[343px]"
      >
        <div className="flex w-full flex-col items-center gap-6 rounded-2xl bg-card p-4">
          <div className="flex w-full flex-col items-center gap-4 pt-2">
            <div className="flex w-full items-start justify-between">
              <div className="size-6 opacity-0" aria-hidden />
              <div className="flex size-11 items-center justify-center rounded-full bg-destructive/10">
                <img src={userMinusUrl} alt="" className="size-6" aria-hidden />
              </div>
              <DialogClose
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-6 rounded-full p-0"
                    aria-label={t('关闭')}
                    onClick={onCancel}
                  />
                }
              >
                <IconX className="size-6 text-foreground" />
              </DialogClose>
            </div>

            <div className="flex w-full flex-col items-center gap-1 text-center text-foreground">
              <DialogTitle className="w-full text-base leading-6 font-bold">
                {t('取消关注')}
              </DialogTitle>
              <p className="w-full whitespace-normal wrap-break-word text-sm leading-5 font-medium">
                {t('确认不再关注 @{{name}} 吗？', {
                  name: target?.nickname ?? '',
                })}
              </p>
            </div>
          </div>

          <Button
            type="button"
            disabled={isPending}
            onClick={onConfirm}
            className={APP_DIALOG_PRIMARY_FULL_WIDTH_BUTTON_CLASS}
          >
            {t('确认')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ProfileFollowRelationsDialog({
  open,
  onOpenChange,
  userId,
  initialTab,
}: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] =
    useState<ProfileFollowRelationTab>(initialTab);
  const [pendingUnfollowTarget, setPendingUnfollowTarget] =
    useState<PendingUnfollowTarget>();
  const [relationOverrides, setRelationOverrides] = useState<
    Partial<Record<string, RelationStatus>>
  >({});
  const [removedFollowerIds, setRemovedFollowerIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [listCacheVersions, setListCacheVersions] = useState<
    Record<ProfileFollowListKind, number>
  >(DEFAULT_LIST_CACHE_VERSIONS);
  const listElementRef = useRef<HTMLUListElement | null>(null);
  const listScrollIntentRef = useRef(false);
  const listLastScrollTopRef = useRef(0);

  function resetFollowListLocalState() {
    listScrollIntentRef.current = false;
    listLastScrollTopRef.current = 0;
    setPendingUnfollowTarget(undefined);
    setRelationOverrides({});
    setRemovedFollowerIds(new Set());
  }

  function refreshAllFollowListQueries() {
    removeProfileFollowListQueries({ queryClient, userId, kinds: LIST_KINDS });
    setListCacheVersions((current) => ({
      followings: current.followings + 1,
      followers: current.followers + 1,
      mutuals: current.mutuals + 1,
    }));
  }

  useEffect(() => {
    if (open) {
      listScrollIntentRef.current = false;
      listLastScrollTopRef.current = 0;
      setActiveTab(initialTab);
      return;
    }

    listScrollIntentRef.current = false;
    listLastScrollTopRef.current = 0;
    setPendingUnfollowTarget(undefined);
    setRelationOverrides({});
    setRemovedFollowerIds(new Set());
    setListCacheVersions(DEFAULT_LIST_CACHE_VERSIONS);
    removeProfileFollowListQueries({ queryClient, userId, kinds: LIST_KINDS });
  }, [initialTab, open, queryClient, userId]);

  const activeListKind = LIST_KIND_BY_TAB[activeTab];
  const queryKey = [
    ...getProfileFollowListQueryKey(userId, activeListKind),
    { version: listCacheVersions[activeListKind] },
  ] as const;

  const listQuery = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam, signal }) =>
      fetchProfileFollowList({
        userId,
        kind: activeListKind,
        mark: pageParam,
        pageSize: PROFILE_FOLLOW_PAGE_SIZE,
        options: { signal },
      }),
    initialPageParam: '0',
    getNextPageParam: getProfileFollowNextPageParam,
    enabled: open,
    gcTime: 0,
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    listScrollIntentRef.current = false;
    listLastScrollTopRef.current = 0;
    listElementRef.current?.scrollTo({ top: 0 });
    removeProfileFollowListQueries({
      queryClient,
      userId,
      kinds: LIST_KINDS.filter((kind) => kind !== activeListKind),
    });
  }, [activeListKind, open, queryClient, userId]);

  const rows = useMemo(() => {
    const rawRows = getProfileFollowRows(listQuery.data?.pages);

    return rawRows
      .filter(
        (item) =>
          activeTab !== 'followers' ||
          !item.userId ||
          !removedFollowerIds.has(item.userId),
      )
      .map((item) => {
        const userIdText = item.userId;
        if (!userIdText) {
          return item;
        }

        const override = relationOverrides[userIdText];
        return override ? { ...item, relationStatus: override } : item;
      });
  }, [activeTab, listQuery.data?.pages, relationOverrides, removedFollowerIds]);

  const isFirstPageLoading =
    listQuery.isPending ||
    (listQuery.isFetching &&
      !listQuery.isFetchingNextPage &&
      rows.length === 0);

  const followMutation = useMutation({
    mutationFn: ({
      targetUserId,
    }: {
      targetUserId: string;
      nextStatus: RelationStatus;
    }) => requestProfileFollow(targetUserId),
    onSuccess: (_data, { targetUserId, nextStatus }) => {
      setRelationOverrides((current) => ({
        ...current,
        [targetUserId]: nextStatus,
      }));
      queryClient.setQueryData<
        InfiniteData<CursorPageResponseFollowListItemResponse>
      >(queryKey, (current) =>
        updateProfileFollowInfiniteData(current, targetUserId, nextStatus),
      );
      void queryClient.invalidateQueries({
        queryKey: getProfileFollowStatsQueryKey(userId),
      });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: ({
      targetUserId,
    }: {
      targetUserId: string;
      nextStatus: RelationStatus;
    }) => requestProfileUnfollow(targetUserId),
    onSuccess: (_data, { targetUserId, nextStatus }) => {
      setRelationOverrides((current) => ({
        ...current,
        [targetUserId]: nextStatus,
      }));
      queryClient.setQueryData<
        InfiniteData<CursorPageResponseFollowListItemResponse>
      >(queryKey, (current) =>
        updateProfileFollowInfiniteData(current, targetUserId, nextStatus),
      );
      void queryClient.invalidateQueries({
        queryKey: getProfileFollowStatsQueryKey(userId),
      });
      setPendingUnfollowTarget(undefined);
    },
  });

  const removeFollowerMutation = useMutation({
    mutationFn: ({ followerId }: { followerId: string }) =>
      requestProfileRemoveFollower(followerId),
    onSuccess: (_data, { followerId }) => {
      setRemovedFollowerIds((current) => new Set(current).add(followerId));
      queryClient.setQueryData<
        InfiniteData<CursorPageResponseFollowListItemResponse>
      >(queryKey, (current) =>
        updateProfileFollowInfiniteData(current, followerId, 'remove'),
      );
      void queryClient.invalidateQueries({
        queryKey: getProfileFollowStatsQueryKey(userId),
      });
      toast.success(t('已移除，对方不会收到通知'));
    },
  });

  function getRowPrimaryIsPending(item: FollowListItemResponse) {
    if (!item.userId) {
      return false;
    }

    return (
      (followMutation.isPending &&
        followMutation.variables?.targetUserId === item.userId) ||
      (unfollowMutation.isPending &&
        unfollowMutation.variables?.targetUserId === item.userId)
    );
  }

  function getRowRemoveIsPending(item: FollowListItemResponse) {
    if (!item.userId) {
      return false;
    }

    return (
      removeFollowerMutation.isPending &&
      removeFollowerMutation.variables?.followerId === item.userId
    );
  }

  function handleClose() {
    onOpenChange(false);
  }

  function handleChangeTab(tab: ProfileFollowRelationTab) {
    if (tab === activeTab) {
      return;
    }

    resetFollowListLocalState();
    listElementRef.current?.scrollTo({ top: 0 });
    refreshAllFollowListQueries();
    setActiveTab(tab);
  }

  function handleNavigateUser(item: FollowListItemResponse) {
    if (!item.userId) {
      return;
    }

    openRouteInNewTab(router, {
      to: '/profile/$userId',
      params: { userId: item.userId },
    });
  }

  function handleEmptyAction() {
    onOpenChange(false);
    if (activeTab === 'followers') {
      void navigate({ to: '/create' });
      return;
    }

    void navigate({ to: '/' });
  }

  function handleFollow(item: FollowListItemResponse) {
    if (!item.userId) {
      return;
    }

    followMutation.mutate({
      targetUserId: item.userId,
      nextStatus: getProfileFollowRelationStatusAfterFollow(
        item.relationStatus,
      ),
    });
  }

  function handleOpenUnfollowConfirm(item: FollowListItemResponse) {
    if (!item.userId) {
      return;
    }

    setPendingUnfollowTarget({
      userId: item.userId,
      nickname: getDisplayName(item, '--'),
      nextStatus: getProfileFollowRelationStatusAfterUnfollow(
        item.relationStatus,
      ),
    });
  }

  function handleConfirmUnfollow() {
    if (!pendingUnfollowTarget) {
      return;
    }

    unfollowMutation.mutate({
      targetUserId: pendingUnfollowTarget.userId,
      nextStatus: pendingUnfollowTarget.nextStatus,
    });
  }

  function handleRemoveFollower(item: FollowListItemResponse) {
    const targetUserId = item.userId;
    if (!targetUserId) {
      return;
    }

    removeFollowerMutation.mutate({ followerId: targetUserId });
  }

  function handleListScrollIntent() {
    listScrollIntentRef.current = true;
  }

  function handleListScroll(event: UIEvent<HTMLUListElement>) {
    if (!listQuery.hasNextPage || listQuery.isFetchingNextPage) {
      return;
    }

    const { scrollTop, clientHeight, scrollHeight } = event.currentTarget;
    const isScrollingDown = scrollTop > listLastScrollTopRef.current;
    listLastScrollTopRef.current = scrollTop;
    if (!isScrollingDown) {
      return;
    }

    if (
      shouldFetchProfileFollowNextPage({
        hasUserScrollIntent: listScrollIntentRef.current,
        scrollTop,
        clientHeight,
        scrollHeight,
      })
    ) {
      listScrollIntentRef.current = false;
      void listQuery.fetchNextPage();
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          bare
          className={cn(
            'w-full gap-0 overflow-hidden rounded-2xl border-0 bg-card p-0 md:max-w-[500px]',
            PROFILE_FOLLOW_DIALOG_CONTENT_MAX_HEIGHT_CLASS,
          )}
        >
          <div className="flex h-full w-full flex-col items-start rounded-2xl bg-card p-6">
            <div className="flex h-full min-h-0 w-full flex-col gap-4">
              <ProfileRelationTabs
                activeTab={activeTab}
                onChange={handleChangeTab}
                onClose={handleClose}
              />

              {isFirstPageLoading || listQuery.isError ? (
                <ProfileFollowStatusState
                  isLoading={isFirstPageLoading}
                  isError={listQuery.isError}
                />
              ) : rows.length === 0 ? (
                <ProfileFollowEmptyState
                  tab={activeTab}
                  onAction={handleEmptyAction}
                />
              ) : (
                <ul
                  key={activeTab}
                  ref={listElementRef}
                  onScroll={handleListScroll}
                  onTouchMove={handleListScrollIntent}
                  onWheel={handleListScrollIntent}
                  className={cn(
                    'flex w-full flex-col gap-6 overflow-y-auto py-4 pr-5',
                    'focus-visible:outline-none',
                    '[scrollbar-gutter:stable] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent',
                    PROFILE_FOLLOW_DIALOG_BODY_HEIGHT_CLASS,
                  )}
                >
                  {rows.map((item, index) => (
                    <ProfileFollowRow
                      key={item.userId ?? `${activeTab}-${String(index)}`}
                      item={item}
                      tab={activeTab}
                      isPrimaryPending={getRowPrimaryIsPending(item)}
                      isRemovePending={getRowRemoveIsPending(item)}
                      onNavigate={handleNavigateUser}
                      onFollow={handleFollow}
                      onUnfollow={handleOpenUnfollowConfirm}
                      onRemoveFollower={handleRemoveFollower}
                    />
                  ))}
                  {listQuery.isFetchingNextPage ? (
                    <li className="flex h-8 w-full items-center justify-center">
                      <Spinner className="size-5 text-muted-foreground" />
                    </li>
                  ) : null}
                </ul>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <UnfollowConfirmDialog
        target={pendingUnfollowTarget}
        isPending={unfollowMutation.isPending}
        onCancel={() => setPendingUnfollowTarget(undefined)}
        onConfirm={handleConfirmUnfollow}
      />
    </>
  );
}
