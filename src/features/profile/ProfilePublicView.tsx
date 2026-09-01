import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { BlockRelationResponseRelation } from '@/api/__generated__/wallet/model/blockRelationResponseRelation';
import { FollowRelationResponseStatus } from '@/api/__generated__/wallet/model/followRelationResponseStatus';
import userMinusUrl from '@/assets/figma/profile-follow/user-minus.svg';
import blockedEmptyUrl from '@/assets/figma/profile-moderation/storyfun-blocked-empty.svg';
import IconX from '@/assets/svg/IconX';
import {
  CONTENT_CONTAINER_STICKY_BLEED_CLASS,
  ContentContainer,
} from '@/components/common/ContentContainer';
import {
  profileContentTabsListClassName,
  profileContentTabsWrapperClassName,
  profileContentTabTriggerClassName,
  profileFavoriteTabsListClassName,
  profileFavoriteTabTriggerClassName,
} from '@/components/common/Tabs';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  getProfileBlockedContentCopy,
  getProfileBlockedInteractionToastKey,
  isProfileBlockedByMe,
  isProfileBlockedByOther,
  isProfileContentBlocked,
  type ProfileBlockRelation,
} from '@/features/profile/profileBlockRelations';
import {
  getProfileRelationAction,
  getProfileRelationActionLabel,
  getProfileRelationStatusAfterFollow,
  getProfileRelationStatusAfterUnfollow,
  type ProfileRelationStatus,
} from '@/features/profile/profileFollowRelations';
import {
  parseProfileUserId,
  sanitizeProfileBio,
  unwrapWalletApiData,
} from '@/features/profile/profileFormat';
import {
  fetchProfileBlockRelation,
  fetchProfileFollowStats,
  fetchProfileOtherUserInfo,
  fetchProfileRelation,
  fetchProfileReportTypes,
  getProfileBlockRelationQueryKey,
  getProfileFollowStatsQueryKey,
  getProfileOtherUserInfoQueryKey,
  getProfileRelationQueryKey,
  getProfileReportTypesQueryKey,
  type OtherUserInfoResponse,
  requestProfileBlock,
  requestProfileFollow,
  requestProfileReportUser,
  requestProfileUnblock,
  requestProfileUnfollow,
} from '@/features/profile/profileWalletApi';
import type { UgcReportSuccessFollowUp } from '@/features/ugc/components/UgcReportDialog';
import { mapUgcReportReasonOptions } from '@/features/ugc/ugcReportApi';
import { useAppLogin } from '@/hooks/useAppLogin';
import { Route } from '@/routes/profile/$userId';
import useGlobalStore from '@/stores/global';
import {
  cn,
  readSnowflakeId,
  resolveProfileAvatarUrl,
  SHOW_DEV_ONLY_UI,
} from '@/utils';

import { ProfileActorIpTabPanel } from './components/ProfileActorIpTabPanel';
import {
  ProfileDramaTabPanel,
  ProfilePageTab,
} from './components/ProfileDramaTabPanel';
import { ProfileHeaderCard } from './components/ProfileHeaderCard';
import {
  ProfileBlockConfirmDialog,
  ProfileReportDialog,
  type ProfileReportFormValue,
  type ProfileReportReasonOption,
} from './components/ProfileModerationDialogs';
import {
  buildProfileFavoriteSearch,
  buildProfileTabSearch,
  resolveProfileActiveTab,
  resolveProfileFavoriteType,
} from './profileRouteSearch';

function ProfilePublicUnfollowConfirmDialog({
  open,
  displayName,
  isPending,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  displayName: string;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={() => undefined}>
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
                  name: displayName,
                })}
              </p>
            </div>
          </div>

          <div className="flex w-full gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={onCancel}
              className="h-11 min-w-0 flex-1 rounded-xl border-wallet-divider bg-background px-4 py-2.5 text-sm leading-5 font-bold text-foreground hover:bg-muted"
            >
              {t('取消')}
            </Button>
            <Button
              type="button"
              disabled={isPending}
              onClick={onConfirm}
              className="h-11 min-w-0 flex-1 rounded-xl bg-foreground px-4 py-2.5 text-sm leading-5 font-bold text-background hover:bg-foreground/90"
            >
              {isPending ? <Spinner className="mr-1 size-4" /> : null}
              {t('确认')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ProfileBlockedContentState({
  relation,
}: {
  relation?: ProfileBlockRelation;
}) {
  const { t } = useTranslation();
  const copy = getProfileBlockedContentCopy(relation);

  return (
    <div className="flex min-h-[calc(100dvh-360px)] w-full flex-1 flex-col items-center justify-center rounded-xl bg-card px-10 py-[180px] text-center">
      <div className="flex flex-col items-center gap-4">
        <img src={blockedEmptyUrl} alt="" className="size-[68px]" aria-hidden />
        <p className="text-sm leading-5 font-normal text-wallet-text-secondary">
          {t(copy.descriptionKey)}
        </p>
      </div>
    </div>
  );
}

export function ProfilePublicView() {
  const { t } = useTranslation();
  const { login } = useAppLogin();
  const queryClient = useQueryClient();
  const isLogin = useGlobalStore((s) => s.isLogin);
  const currentUserId = useGlobalStore((s) =>
    readSnowflakeId(s.userProfile?.userId),
  );
  const { userId: userIdParam } = Route.useParams();
  const routeSearch = Route.useSearch();
  const navigateProfile = Route.useNavigate();
  const profileUserId = parseProfileUserId(userIdParam);
  const isOwnProfile =
    profileUserId !== undefined && profileUserId === currentUserId;

  const activeTab = resolveProfileActiveTab(routeSearch.tab);
  const favoriteType = resolveProfileFavoriteType(routeSearch.favorite);

  useEffect(() => {
    if (SHOW_DEV_ONLY_UI || routeSearch.tab !== ProfilePageTab.ActorIp) {
      return;
    }

    void navigateProfile({
      search: (prev) => buildProfileTabSearch(prev, ProfilePageTab.Dramas),
      replace: true,
      resetScroll: false,
    });
  }, [navigateProfile, routeSearch.tab]);

  const [relationOverride, setRelationOverride] =
    useState<ProfileRelationStatus>();
  const [blockRelationOverride, setBlockRelationOverride] =
    useState<ProfileBlockRelation>();
  const [unfollowConfirmOpen, setUnfollowConfirmOpen] = useState(false);
  const [blockConfirmOpen, setBlockConfirmOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [reportBlockDone, setReportBlockDone] = useState(false);
  const otherUserInfoQueryKey = [
    ...getProfileOtherUserInfoQueryKey(profileUserId ?? ''),
    { isLogin },
  ] as const;
  const relationQueryKey = [
    ...getProfileRelationQueryKey(profileUserId ?? ''),
    { isLogin },
  ] as const;
  const blockRelationQueryKey = [
    ...getProfileBlockRelationQueryKey(profileUserId ?? ''),
    { isLogin },
  ] as const;

  const { data: otherUserInfoResponse } = useQuery({
    queryKey: otherUserInfoQueryKey,
    queryFn: () => fetchProfileOtherUserInfo(profileUserId ?? ''),
    enabled: profileUserId !== undefined && !isOwnProfile,
    retry: false,
  });
  const { data: followStats } = useQuery({
    queryKey: getProfileFollowStatsQueryKey(profileUserId ?? ''),
    queryFn: ({ signal }) =>
      fetchProfileFollowStats(profileUserId ?? '', { signal }),
    enabled: profileUserId !== undefined && !isOwnProfile,
  });
  const { data: relation } = useQuery({
    queryKey: relationQueryKey,
    queryFn: ({ signal }) =>
      fetchProfileRelation(profileUserId ?? '', { signal }),
    enabled: isLogin && profileUserId !== undefined && !isOwnProfile,
    retry: false,
  });
  const { data: blockRelationResponse } = useQuery({
    queryKey: blockRelationQueryKey,
    queryFn: ({ signal }) =>
      fetchProfileBlockRelation(profileUserId ?? '', { signal }),
    enabled: isLogin && profileUserId !== undefined && !isOwnProfile,
    retry: false,
  });
  const { data: reportTypeItems, isLoading: isReportReasonsLoading } = useQuery(
    {
      queryKey: getProfileReportTypesQueryKey(),
      queryFn: ({ signal }) => fetchProfileReportTypes({ signal }),
      enabled: reportOpen && !reportSubmitted,
      retry: false,
    },
  );

  const otherUser = useMemo(() => {
    if (otherUserInfoResponse?.status !== 200) {
      return undefined;
    }

    return unwrapWalletApiData<OtherUserInfoResponse>(otherUserInfoResponse);
  }, [otherUserInfoResponse]);

  const displayName = useMemo(() => {
    const nickname = otherUser?.nickname?.trim();
    return nickname ? nickname : '--';
  }, [otherUser?.nickname]);

  const avatarUrl = resolveProfileAvatarUrl(otherUser?.avatarUrl);
  const profileBio = sanitizeProfileBio(otherUser?.profile ?? '') || undefined;
  const relationStatus =
    relationOverride ??
    relation?.status ??
    (otherUser?.relationStatus as ProfileRelationStatus | undefined) ??
    FollowRelationResponseStatus.NONE;
  const blockRelation =
    blockRelationOverride ??
    blockRelationResponse?.relation ??
    BlockRelationResponseRelation.NONE;
  const blockedByMe = isProfileBlockedByMe(blockRelation);
  const blockedByOther = isProfileBlockedByOther(blockRelation);
  const contentBlocked = isProfileContentBlocked(blockRelation);
  const followActionLabelKey = blockedByMe
    ? '解除拉黑'
    : blockedByOther
      ? undefined
      : getProfileRelationActionLabel(relationStatus);
  const followAction = getProfileRelationAction(relationStatus);
  const reportReasonOptions = useMemo<ProfileReportReasonOption[]>(
    () => mapUgcReportReasonOptions(reportTypeItems),
    [reportTypeItems],
  );

  const followMutation = useMutation({
    mutationFn: () => requestProfileFollow(profileUserId ?? ''),
    onSuccess: () => {
      setRelationOverride(getProfileRelationStatusAfterFollow(relationStatus));
      void queryClient.invalidateQueries({
        queryKey: relationQueryKey,
      });
      void queryClient.invalidateQueries({
        queryKey: otherUserInfoQueryKey,
      });
      void queryClient.invalidateQueries({
        queryKey: getProfileFollowStatsQueryKey(profileUserId ?? ''),
      });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: () => requestProfileUnfollow(profileUserId ?? ''),
    onSuccess: () => {
      setRelationOverride(
        getProfileRelationStatusAfterUnfollow(relationStatus),
      );
      setUnfollowConfirmOpen(false);
      void queryClient.invalidateQueries({
        queryKey: relationQueryKey,
      });
      void queryClient.invalidateQueries({
        queryKey: otherUserInfoQueryKey,
      });
      void queryClient.invalidateQueries({
        queryKey: getProfileFollowStatsQueryKey(profileUserId ?? ''),
      });
    },
  });

  const blockMutation = useMutation({
    mutationFn: () => requestProfileBlock(profileUserId ?? ''),
    onSuccess: () => {
      setBlockRelationOverride(
        blockedByOther
          ? BlockRelationResponseRelation.MUTUAL_BLOCK
          : BlockRelationResponseRelation.BLOCKED_BY_ME,
      );
      setRelationOverride(FollowRelationResponseStatus.NONE);
      setBlockConfirmOpen(false);
      void queryClient.invalidateQueries({ queryKey: blockRelationQueryKey });
      void queryClient.invalidateQueries({ queryKey: relationQueryKey });
      void queryClient.invalidateQueries({ queryKey: otherUserInfoQueryKey });
      void queryClient.invalidateQueries({
        queryKey: getProfileFollowStatsQueryKey(profileUserId ?? ''),
      });
      toast.success(t('已拉黑'));
      setReportBlockDone(true);
    },
    onError: () => {
      toast.error(t('再试一次'));
    },
  });
  const reportSuccessFollowUps = useMemo<UgcReportSuccessFollowUp[]>(() => {
    if (displayName === '--') {
      return [];
    }

    return [
      {
        id: 'block-user',
        userId: profileUserId ?? undefined,
        avatarUrl,
        displayName,
        actionLabelKey: '拉黑',
        completedLabelKey: '已拉黑',
        completedVisual: 'outline',
        onAction: () => {
          if (blockedByMe || reportBlockDone || blockMutation.isPending) {
            return;
          }

          blockMutation.mutate();
        },
        isPending: blockMutation.isPending,
        disabled: blockedByMe || reportBlockDone,
      },
    ];
  }, [
    avatarUrl,
    blockMutation.isPending,
    blockMutation.mutate,
    blockedByMe,
    displayName,
    profileUserId,
    reportBlockDone,
  ]);

  const unblockMutation = useMutation({
    mutationFn: () => requestProfileUnblock(profileUserId ?? ''),
    onSuccess: () => {
      setBlockRelationOverride(
        blockedByOther
          ? BlockRelationResponseRelation.BLOCKED_BY_OTHER
          : BlockRelationResponseRelation.NONE,
      );
      void queryClient.invalidateQueries({ queryKey: blockRelationQueryKey });
      void queryClient.invalidateQueries({ queryKey: otherUserInfoQueryKey });
      toast.success(t('已解除拉黑'));
    },
    onError: () => {
      toast.error(t('再试一次'));
    },
  });

  const reportMutation = useMutation({
    mutationFn: (value: ProfileReportFormValue) =>
      requestProfileReportUser({
        targetUserId: profileUserId ?? '',
        data: value,
      }),
    onSuccess: () => {
      setReportSubmitted(true);
    },
  });

  const isRelationSubmitting =
    followMutation.isPending ||
    unfollowMutation.isPending ||
    unblockMutation.isPending;

  useEffect(() => {
    if (!isOwnProfile) {
      return;
    }

    void navigateProfile({
      to: '/profile',
      search: routeSearch,
      replace: true,
    });
  }, [isOwnProfile, navigateProfile, routeSearch]);

  useEffect(() => {
    if (isLogin || isOwnProfile || profileUserId === undefined) {
      return;
    }

    login();
  }, [isLogin, isOwnProfile, login, profileUserId]);

  function handleFollowAction() {
    if (isOwnProfile) {
      return;
    }

    if (!isLogin) {
      login();
      return;
    }

    if (blockedByMe) {
      unblockMutation.mutate();
      return;
    }

    const blockedToastKey = getProfileBlockedInteractionToastKey({
      relation: blockRelation,
      interaction: 'follow',
    });
    if (blockedToastKey) {
      toast.error(t(blockedToastKey));
      return;
    }

    if (followAction === 'unfollow') {
      setUnfollowConfirmOpen(true);
      return;
    }

    followMutation.mutate();
  }

  function handleConfirmUnfollow() {
    unfollowMutation.mutate();
  }

  function handleOpenReport() {
    if (!isLogin) {
      login();
      return;
    }

    setReportSubmitted(false);
    setReportBlockDone(false);
    setReportOpen(true);
  }

  function handleOpenBlockConfirm() {
    if (!isLogin) {
      login();
      return;
    }

    if (blockedByMe) {
      unblockMutation.mutate();
      return;
    }

    setBlockConfirmOpen(true);
  }

  function handleCloseReportDone() {
    setReportOpen(false);
    setReportSubmitted(false);
    setReportBlockDone(false);
    void queryClient.invalidateQueries({ queryKey: blockRelationQueryKey });
  }

  // 触发条件：切换个人中心内容页签
  // 行为目的：仅接受已知 tab，避免非法 value 写入
  function handleContentTabChange(value: string) {
    if (
      value === ProfilePageTab.Dramas ||
      value === ProfilePageTab.Works ||
      value === ProfilePageTab.ActorIp ||
      value === ProfilePageTab.Likes ||
      value === ProfilePageTab.Favorites
    ) {
      void navigateProfile({
        search: (prev) => buildProfileTabSearch(prev, value),
        replace: true,
        resetScroll: false,
      });
    }
  }

  // 触发条件：收藏二级页签切换
  // 行为目的：仅接受短剧 / 作品类型
  function handleFavoriteTypeChange(value: string) {
    if (value === 'SHORT_DRAMA' || value === 'SHORT_VIDEO') {
      void navigateProfile({
        search: (prev) => buildProfileFavoriteSearch(prev, value),
        replace: true,
        resetScroll: false,
      });
    }
  }

  if (profileUserId === undefined) {
    return (
      <div
        className={cn(
          'flex min-h-0 w-full min-w-0 flex-1 flex-col items-center justify-center',
          'bg-points-page-surface-muted py-16',
        )}
      >
        <p className="text-sm text-muted-foreground">{t('暂无数据')}</p>
      </div>
    );
  }

  if (isOwnProfile) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex min-h-0 w-full min-w-0 flex-1 flex-col',
        'bg-points-page-surface-muted',
      )}
    >
      <ContentContainer
        className={cn(
          'flex w-full flex-1 flex-col gap-5 pt-0 pb-4 md:gap-6 md:py-4',
        )}
      >
        <ProfileHeaderCard
          isOwn={false}
          isLogin={isLogin}
          displayName={displayName}
          profile={profileBio}
          userId={profileUserId}
          avatarUrl={avatarUrl}
          followStats={followStats}
          followActionLabelKey={followActionLabelKey}
          isFollowActionPending={isRelationSubmitting}
          showMoreActions={isLogin}
          blockActionLabelKey={blockedByMe ? '解除拉黑' : '拉黑'}
          onFollowActionClick={handleFollowAction}
          onReportClick={handleOpenReport}
          onBlockActionClick={handleOpenBlockConfirm}
        />

        {contentBlocked ? (
          <ProfileBlockedContentState relation={blockRelation} />
        ) : (
          <Tabs
            value={activeTab}
            onValueChange={handleContentTabChange}
            className="flex w-full min-w-0 flex-col gap-0"
          >
            <div
              className={cn(
                profileContentTabsWrapperClassName,
                CONTENT_CONTAINER_STICKY_BLEED_CLASS,
                // 吸顶铺满版心留白；横向滚动仅发生在 Tab 容器内，禁止撑开整页
                'sticky top-11 z-20 min-w-0 bg-points-page-surface-muted md:top-14',
              )}
            >
              <TabsList
                variant="line"
                className={profileContentTabsListClassName}
              >
                <TabsTrigger
                  value={ProfilePageTab.Dramas}
                  className={profileContentTabTriggerClassName}
                >
                  {t('短剧')}
                </TabsTrigger>
                <TabsTrigger
                  value={ProfilePageTab.Works}
                  className={profileContentTabTriggerClassName}
                >
                  {t('作品')}
                </TabsTrigger>
                {SHOW_DEV_ONLY_UI ? (
                  <TabsTrigger
                    value={ProfilePageTab.ActorIp}
                    className={profileContentTabTriggerClassName}
                  >
                    {t('角色IP')}
                  </TabsTrigger>
                ) : null}
                <TabsTrigger
                  value={ProfilePageTab.Likes}
                  className={profileContentTabTriggerClassName}
                >
                  {t('点赞')}
                </TabsTrigger>
                <TabsTrigger
                  value={ProfilePageTab.Favorites}
                  className={profileContentTabTriggerClassName}
                >
                  {t('收藏')}
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value={ProfilePageTab.Dramas} className="mt-0 pt-4">
              <ProfileDramaTabPanel
                userId={profileUserId}
                tab={ProfilePageTab.Dramas}
                enabled={activeTab === ProfilePageTab.Dramas}
                publishedCreatorDisplayName={displayName}
              />
            </TabsContent>

            <TabsContent value={ProfilePageTab.Works} className="mt-0 pt-4">
              <ProfileDramaTabPanel
                userId={profileUserId}
                tab={ProfilePageTab.Works}
                enabled={activeTab === ProfilePageTab.Works}
                publishedCreatorDisplayName={displayName}
              />
            </TabsContent>

            {SHOW_DEV_ONLY_UI ? (
              <TabsContent value={ProfilePageTab.ActorIp} className="mt-0 pt-4">
                <ProfileActorIpTabPanel
                  userId={profileUserId}
                  enabled={activeTab === ProfilePageTab.ActorIp}
                />
              </TabsContent>
            ) : null}

            <TabsContent value={ProfilePageTab.Likes} className="mt-0 pt-4">
              <ProfileDramaTabPanel
                userId={profileUserId}
                tab={ProfilePageTab.Likes}
                enabled={activeTab === ProfilePageTab.Likes}
              />
            </TabsContent>

            <TabsContent value={ProfilePageTab.Favorites} className="mt-0 pt-3">
              <div className="flex flex-col gap-4">
                <Tabs
                  value={favoriteType}
                  onValueChange={handleFavoriteTypeChange}
                >
                  <TabsList className={profileFavoriteTabsListClassName}>
                    <TabsTrigger
                      value="SHORT_DRAMA"
                      className={profileFavoriteTabTriggerClassName}
                    >
                      {t('短剧')}
                    </TabsTrigger>
                    <TabsTrigger
                      value="SHORT_VIDEO"
                      className={profileFavoriteTabTriggerClassName}
                    >
                      {t('作品')}
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                <ProfileDramaTabPanel
                  userId={profileUserId}
                  tab={ProfilePageTab.Favorites}
                  favoriteType={favoriteType}
                  enabled={activeTab === ProfilePageTab.Favorites}
                />
              </div>
            </TabsContent>
          </Tabs>
        )}
      </ContentContainer>

      <ProfilePublicUnfollowConfirmDialog
        open={unfollowConfirmOpen}
        displayName={displayName}
        isPending={unfollowMutation.isPending}
        onCancel={() => setUnfollowConfirmOpen(false)}
        onConfirm={handleConfirmUnfollow}
      />
      <ProfileBlockConfirmDialog
        open={blockConfirmOpen}
        isPending={blockMutation.isPending}
        onCancel={() => setBlockConfirmOpen(false)}
        onConfirm={() => blockMutation.mutate()}
      />
      <ProfileReportDialog
        open={reportOpen}
        isSubmitting={reportMutation.isPending}
        isReasonsLoading={isReportReasonsLoading}
        reasonOptions={reportReasonOptions}
        submitted={reportSubmitted}
        successFollowUps={reportSuccessFollowUps}
        onCancel={() => setReportOpen(false)}
        onSubmit={(value) => reportMutation.mutate(value)}
        onDone={handleCloseReportDone}
      />
    </div>
  );
}
