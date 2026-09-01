import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import store2 from 'store2';

import {
  getUserInfoQueryKey,
  useUpdateAvatar,
  useUpdateNickname,
  useUserInfo,
} from '@/api/__generated__/wallet/userwallet-user/userwallet-user';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ProfileFollowRelationTab } from '@/features/profile/profileFollowRelations';
import {
  mergeUserProfilePatch,
  parseProfileUserId,
  sanitizeProfileBio,
  unwrapWalletApiData,
} from '@/features/profile/profileFormat';
import useGlobalStore from '@/stores/global';
import {
  cn,
  formatAddress,
  resolveProfileAvatarUrl,
  SHOW_DEV_ONLY_UI,
} from '@/utils';

import { ProfileActorIpTabPanel } from './components/ProfileActorIpTabPanel';
import {
  ProfileDramaTabPanel,
  ProfilePageTab,
} from './components/ProfileDramaTabPanel';
import { ProfileEditDialog } from './components/ProfileEditDialog';
import { ProfileFollowRelationsDialog } from './components/ProfileFollowRelationsDialog';
import { ProfileHeaderCard } from './components/ProfileHeaderCard';
import {
  type ProfileHistoryType,
  ProfileWatchHistoryTabPanel,
} from './components/ProfileWatchHistoryTabPanel';
import {
  buildProfileFavoriteSearch,
  buildProfileTabSearch,
  resolveProfileActiveTab,
  resolveProfileFavoriteType,
} from './profileRouteSearch';
import {
  fetchProfileFollowStats,
  getProfileFollowStatsQueryKey,
} from './profileWalletApi';

const profileRoute = getRouteApi('/profile/');

export function ProfileView() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const routeSearch = profileRoute.useSearch();
  const navigateProfile = profileRoute.useNavigate();
  const userProfile = useGlobalStore((s) => s.userProfile);
  const setUserInfo = useGlobalStore((s) => s.setUserInfo);
  const isLogin = useGlobalStore((s) => s.isLogin);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [followRelationTab, setFollowRelationTab] =
    useState<ProfileFollowRelationTab>();
  const [historyType, setHistoryType] =
    useState<ProfileHistoryType>('SHORT_DRAMA');
  const activeTab = resolveProfileActiveTab(routeSearch.tab);
  const favoriteType = resolveProfileFavoriteType(routeSearch.favorite);

  const { mutateAsync: updateNickname, isPending: isNicknamePending } =
    useUpdateNickname();
  const { mutateAsync: updateAvatar, isPending: isAvatarPending } =
    useUpdateAvatar();

  const { data: userInfoResponse } = useUserInfo({
    query: { enabled: isLogin },
  });

  useEffect(() => {
    if (userInfoResponse?.status !== 200) {
      return;
    }

    const freshProfile =
      unwrapWalletApiData<typeof userProfile>(userInfoResponse);
    if (!freshProfile) {
      return;
    }

    const token = store2.get('userToken') as string | undefined;
    setUserInfo({ token, userProfile: freshProfile });
  }, [userInfoResponse, setUserInfo]);

  const profileUserId = parseProfileUserId(userProfile?.userId);
  const { data: followStats } = useQuery({
    queryKey: getProfileFollowStatsQueryKey(profileUserId ?? ''),
    queryFn: ({ signal }) =>
      fetchProfileFollowStats(profileUserId ?? '', { signal }),
    enabled: isLogin && profileUserId !== undefined,
  });
  const email =
    typeof userProfile?.email === 'string' && userProfile.email.trim() !== ''
      ? userProfile.email.trim()
      : undefined;
  const nickname = userProfile?.nickname?.trim();
  const displayName = nickname
    ? nickname
    : email
      ? email
      : userProfile?.walletAddress?.trim()
        ? formatAddress(userProfile.walletAddress)
        : t('匿名用户');
  const avatarUrl = userProfile?.avatarUrl?.trim() || undefined;
  const profileBio =
    sanitizeProfileBio(userProfile?.profile ?? '') || undefined;

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

  async function handleSaveProfile(payload: {
    nickname: string;
    profile: string;
    avatarUrl?: string;
  }) {
    const currentNickname = userProfile?.nickname?.trim() ?? '';
    const currentAvatarResolved =
      resolveProfileAvatarUrl(userProfile?.avatarUrl) ?? '';
    const currentProfile = sanitizeProfileBio(userProfile?.profile ?? '');
    const nextNickname = payload.nickname.trim();
    const nextProfile = sanitizeProfileBio(payload.profile);
    const nextAvatar = payload.avatarUrl?.trim() ?? '';

    const nicknameChanged = nextNickname !== currentNickname;
    const profileChanged = nextProfile !== currentProfile;
    const avatarChanged =
      Boolean(nextAvatar) && nextAvatar !== currentAvatarResolved;

    if (!nicknameChanged && !profileChanged && !avatarChanged) {
      setIsEditOpen(false);
      return;
    }

    try {
      // 有变更的字段并行提交：昵称/简介 POST /api/userWallet/nickname，头像 POST /api/userWallet/avatar
      const mutations: Promise<unknown>[] = [];

      if (nicknameChanged || profileChanged) {
        mutations.push(
          updateNickname({
            data: {
              nickname: nextNickname,
              ...(profileChanged ? { profile: nextProfile } : {}),
            },
          }),
        );
      }

      if (avatarChanged) {
        mutations.push(updateAvatar({ data: { avatarUrl: nextAvatar } }));
      }

      await Promise.all(mutations);

      const token = store2.get('userToken') as string | undefined;
      setUserInfo({
        token,
        userProfile: mergeUserProfilePatch(userProfile ?? null, {
          nickname: nextNickname,
          ...(profileChanged ? { profile: nextProfile } : {}),
          ...(avatarChanged ? { avatarUrl: nextAvatar } : {}),
        }),
      });

      await queryClient.invalidateQueries({ queryKey: getUserInfoQueryKey() });
      toast.success(t('个人资料已更新'));
      setIsEditOpen(false);
    } catch {
      /* appAxiosInstance 已 toast */
    }
  }

  function handleOpenFollowRelations(tab: ProfileFollowRelationTab) {
    setFollowRelationTab(tab);
  }

  // 触发条件：切换个人中心内容页签
  // 行为目的：仅接受已知 tab，避免非法 value 写入
  function handleContentTabChange(value: string) {
    if (
      value === ProfilePageTab.Dramas ||
      value === ProfilePageTab.Works ||
      value === ProfilePageTab.ActorIp ||
      value === ProfilePageTab.Likes ||
      value === ProfilePageTab.Favorites ||
      value === ProfilePageTab.History
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

  // 触发条件：观看历史二级页签切换
  function handleHistoryTypeChange(value: string) {
    if (value === 'SHORT_DRAMA' || value === 'SHORT_VIDEO') {
      setHistoryType(value);
    }
  }

  if (profileUserId === undefined) {
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
        className={cn('flex w-full flex-col gap-5 pt-0 pb-4 md:gap-6 md:py-4')}
      >
        <ProfileHeaderCard
          isOwn
          displayName={displayName}
          profile={profileBio}
          userId={profileUserId}
          avatarUrl={avatarUrl}
          followStats={followStats}
          onEditClick={() => setIsEditOpen(true)}
          onFollowRelationClick={handleOpenFollowRelations}
        />

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
              <TabsTrigger
                value={ProfilePageTab.History}
                className={profileContentTabTriggerClassName}
              >
                {t('观看历史')}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value={ProfilePageTab.Dramas} className="mt-0 pt-4">
            <ProfileDramaTabPanel
              userId={profileUserId}
              tab={ProfilePageTab.Dramas}
              enabled={activeTab === ProfilePageTab.Dramas}
              isOwn
              publishedCreatorDisplayName={displayName}
            />
          </TabsContent>

          <TabsContent value={ProfilePageTab.Works} className="mt-0 pt-4">
            <ProfileDramaTabPanel
              userId={profileUserId}
              tab={ProfilePageTab.Works}
              enabled={activeTab === ProfilePageTab.Works}
              isOwn
              publishedCreatorDisplayName={displayName}
            />
          </TabsContent>

          {SHOW_DEV_ONLY_UI ? (
            <TabsContent value={ProfilePageTab.ActorIp} className="mt-0 pt-4">
              <ProfileActorIpTabPanel
                userId={profileUserId}
                enabled={activeTab === ProfilePageTab.ActorIp}
                isOwn
              />
            </TabsContent>
          ) : null}

          <TabsContent value={ProfilePageTab.Likes} className="mt-0 pt-4">
            <ProfileDramaTabPanel
              userId={profileUserId}
              tab={ProfilePageTab.Likes}
              enabled={activeTab === ProfilePageTab.Likes}
              isOwn
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
                isOwn
              />
            </div>
          </TabsContent>

          <TabsContent value={ProfilePageTab.History} className="mt-0 pt-3">
            <div className="flex flex-col gap-4">
              <Tabs value={historyType} onValueChange={handleHistoryTypeChange}>
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
              <ProfileWatchHistoryTabPanel
                historyType={historyType}
                enabled={activeTab === ProfilePageTab.History}
              />
            </div>
          </TabsContent>
        </Tabs>
      </ContentContainer>

      <ProfileEditDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        initialDisplayName={displayName === t('匿名用户') ? '' : displayName}
        initialProfile={profileBio ?? ''}
        email={email}
        initialAvatarUrl={avatarUrl}
        userId={profileUserId}
        isSaving={isNicknamePending || isAvatarPending}
        onSave={handleSaveProfile}
      />

      <ProfileFollowRelationsDialog
        open={followRelationTab !== undefined}
        onOpenChange={(open) => !open && setFollowRelationTab(undefined)}
        userId={profileUserId}
        initialTab={followRelationTab ?? 'following'}
      />
    </div>
  );
}
