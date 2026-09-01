import { useInfiniteQuery } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import type { TFunction } from 'i18next';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useInView } from 'react-intersection-observer';
import { toast } from 'sonner';

import type { DramaListItemResponse } from '@/api/__generated__/story/model/dramaListItemResponse';
import type { UserProfileUnifiedResponse } from '@/api/__generated__/story/model/userProfileUnifiedResponse';
import IconNoData from '@/assets/svg/IconNoData';
import AppLoadingContainer from '@/components/common/AppLoadingContainer';
import { ShortVideoCardCoverStats } from '@/components/common/ShortVideoCardCoverStats';
import { UserProfileAvatar } from '@/components/common/UserProfileAvatar';
import { UserProfileAvatarLink } from '@/components/common/UserProfileAvatarLink';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { ContentBadge } from '@/features/badge/ContentBadge';
import {
  getCreationPlayBlockToastKey,
  isCreationPlayableStatus,
} from '@/features/creation-management/creationManagementFormat';
import { PlayDramaCard } from '@/features/play/components/PlayDramaCard';
import {
  getRoleAvatarFallback,
  PLAY_CARD_COVER_ASPECT_CLASS,
  PLAY_THEATER_CARD_ROW_MIN_HEIGHT_PX,
  PLAY_THEATER_GRID_VIEW_CLASS,
  PLAY_THEATER_GRID_VIEW_DESKTOP_CLASS,
} from '@/features/play/playFormat';
import { getPlayPlaylistNavigateSearch } from '@/features/play/playPlaylistNavigate';
import { usePlayPlaylistStore } from '@/features/play/playPlaylistStore';
import {
  PlayFeedContentType,
  type PlayImmersiveItem,
  PlayPlaylistSource,
} from '@/features/play/types/playImmersive';
import {
  getProfileCursorNextPageParam,
  getProfilePlayStatus,
  isProfileDramaEpisodeItem,
  isProfileShortVideoItem,
  mapUserProfileDramaToListItem,
  PROFILE_LIST_PAGE_SIZE,
  readProfileWorkDurationSec,
  readProfileWorkLikeCount,
  unwrapProfileUnifiedPage,
} from '@/features/profile/profileFormat';
import {
  fetchProfileDramas,
  fetchProfileFavoriteDramas,
  fetchProfileLikes,
  fetchProfileWorks,
  getProfileDramasQueryKey,
  getProfileFavoriteDramasQueryKey,
  getProfileLikesQueryKey,
  getProfileWorksQueryKey,
} from '@/features/profile/profileUserProfilesApi';
import { cn, formatCreatorAtHandle, readSnowflakeId } from '@/utils';

/** 个人中心内容页签（单一事实来源；作品后为角色 IP） */
export enum ProfilePageTab {
  Dramas = 'dramas',
  Works = 'works',
  ActorIp = 'actor-ip',
  Likes = 'likes',
  Favorites = 'favorites',
  History = 'history',
}

export type ProfileContentTab =
  | ProfilePageTab.Dramas
  | ProfilePageTab.Works
  | ProfilePageTab.Likes
  | ProfilePageTab.Favorites;
export type ProfileFavoriteType = 'SHORT_DRAMA' | 'SHORT_VIDEO';

type ProfileDramaTabPanelProps = {
  userId: string;
  tab: ProfileContentTab;
  enabled: boolean;
  isOwn?: boolean;
  favoriteType?: ProfileFavoriteType;
  /** 短剧 / 作品 tab 卡片展示的创作者名（资料页主人） */
  publishedCreatorDisplayName?: string;
};

function parseMarkParam(mark: string | undefined): number | undefined {
  if (mark === undefined) {
    return undefined;
  }

  const parsed = Number(mark);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  return parsed;
}

function flattenProfileWorkItems(
  pages: Array<{ data?: unknown } | undefined> | undefined,
): UserProfileUnifiedResponse[] {
  const out: UserProfileUnifiedResponse[] = [];
  for (const page of pages ?? []) {
    const pageData = unwrapProfileUnifiedPage(page);
    out.push(...(pageData?.list ?? []));
  }
  return out;
}

function getProfilePlaybackItems(
  items: UserProfileUnifiedResponse[],
  tab: ProfileContentTab,
): UserProfileUnifiedResponse[] {
  if (tab !== ProfilePageTab.Works) {
    return items;
  }

  return [...items].sort(compareProfileWorkPublishTimeDesc);
}

function isProfileItemPlayable(item: UserProfileUnifiedResponse): boolean {
  const status = getProfilePlayStatus(item);

  if (status === undefined) {
    return true;
  }

  return isCreationPlayableStatus(status);
}

function buildProfilePlaybackPlaylist(
  items: UserProfileUnifiedResponse[],
): PlayImmersiveItem[] {
  const playlist: PlayImmersiveItem[] = [];

  for (const item of items) {
    if (!isProfileItemPlayable(item)) {
      continue;
    }

    const isShortVideo = isProfileShortVideoItem(item);
    const dramaId = readSnowflakeId(item.drama?.dramaId);
    const episodeId = readSnowflakeId(item.episode?.episodeId);
    const playPathId = isShortVideo ? episodeId : dramaId;
    if (!playPathId) {
      continue;
    }

    if (isShortVideo && !episodeId) {
      continue;
    }

    playlist.push({
      dramaId: playPathId,
      episodeId,
      episodeNo: item.episode?.episodeNo ?? undefined,
      contentType: isShortVideo
        ? PlayFeedContentType.ShortVideo
        : PlayFeedContentType.DramaEpisode,
      feed: item as PlayImmersiveItem['feed'],
    });
  }

  return playlist;
}

export function ProfileDramaTabPanel({
  userId,
  tab,
  enabled,
  isOwn = false,
  favoriteType = 'SHORT_DRAMA',
  publishedCreatorDisplayName,
}: ProfileDramaTabPanelProps) {
  const { t } = useTranslation();
  const { ref, inView } = useInView();
  const setPlaylist = usePlayPlaylistStore((state) => state.setPlaylist);

  const listParams = useMemo(() => ({ pageSize: PROFILE_LIST_PAGE_SIZE }), []);
  const favoriteListParams = useMemo(
    () => ({ pageSize: PROFILE_LIST_PAGE_SIZE, type: favoriteType }),
    [favoriteType],
  );
  const shouldRenderDramaCards =
    tab === 'dramas' || (tab === 'favorites' && favoriteType === 'SHORT_DRAMA');

  const {
    data,
    isPending,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey:
      tab === 'dramas'
        ? getProfileDramasQueryKey(userId, listParams)
        : tab === 'works'
          ? getProfileWorksQueryKey(userId, listParams)
          : tab === 'likes'
            ? getProfileLikesQueryKey(userId, listParams)
            : getProfileFavoriteDramasQueryKey(userId, favoriteListParams),
    queryFn: ({ pageParam }) => {
      const mark = parseMarkParam(pageParam as string | undefined);
      const params = {
        pageSize: PROFILE_LIST_PAGE_SIZE,
        mark,
      };

      if (tab === 'dramas') {
        return fetchProfileDramas(userId, params);
      }
      if (tab === 'works') {
        return fetchProfileWorks(userId, params);
      }
      if (tab === 'likes') {
        return fetchProfileLikes(userId, params);
      }

      return fetchProfileFavoriteDramas(userId, {
        ...params,
        type: favoriteType,
      });
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: getProfileCursorNextPageParam,
    retry: false,
    enabled: enabled && userId.length > 0,
  });

  const profileItems = useMemo(() => {
    const out = flattenProfileWorkItems(data?.pages);
    return getProfilePlaybackItems(out, tab);
  }, [data?.pages, tab]);

  const dramaItems = useMemo(() => {
    if (!data?.pages?.length) {
      return [] as DramaListItemResponse[];
    }

    const out: DramaListItemResponse[] = [];
    for (const item of profileItems) {
      const listItem = mapUserProfileDramaToListItem(item, {
        creatorNameFallback:
          tab === 'dramas' || tab === 'works'
            ? publishedCreatorDisplayName
            : undefined,
      });
      if (!listItem) {
        continue;
      }

      out.push(listItem);
    }

    return out;
  }, [data?.pages, profileItems, publishedCreatorDisplayName, tab]);

  useEffect(() => {
    if (!inView || !hasNextPage || isFetchingNextPage) {
      return;
    }

    void fetchNextPage();
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // 触发条件：从个人主页任意可播放卡片进入播放页
  // 行为目的：把当前 tab 的已加载列表交给播放器按同序连播
  function handleProfileBeforePlay() {
    setPlaylist(
      PlayPlaylistSource.Profile,
      buildProfilePlaybackPlaylist(profileItems),
      {
        hasMore: Boolean(hasNextPage),
        loadMore: async () => {
          const result = await fetchNextPage();
          const nextItems = getProfilePlaybackItems(
            flattenProfileWorkItems(result.data?.pages),
            tab,
          );
          return {
            items: buildProfilePlaybackPlaylist(nextItems),
            hasMore: Boolean(result.hasNextPage),
          };
        },
      },
    );
  }

  function handleProfilePlayBlocked(item: UserProfileUnifiedResponse) {
    toast.error(t(getCreationPlayBlockToastKey(getProfilePlayStatus(item))));
  }

  if (isError) {
    return (
      <div className={cn('flex flex-col items-center gap-4 py-12')}>
        <p className={cn('text-sm text-muted-foreground')}>{t('再试一次')}</p>
        <Button type="button" variant="outline" onClick={() => refetch()}>
          {t('再试一次')}
        </Button>
      </div>
    );
  }

  const listData = shouldRenderDramaCards ? dramaItems : profileItems;

  return (
    <AppLoadingContainer
      data={listData}
      isLoading={isPending}
      // 与创作管理列表一致：加载 / 空态固定一行卡片高度，Spinner / 空态垂直居中
      minHeight={PLAY_THEATER_CARD_ROW_MIN_HEIGHT_PX}
      scrollable={false}
      // Loading 无卡片底；空态保留 bg-card
      stateClassName={isPending ? undefined : 'gap-6 rounded-xl bg-card px-10'}
      emptyContent={<ProfileEmptyState tab={tab} isOwn={isOwn} />}
    >
      {shouldRenderDramaCards ? (
        <ul
          className={cn(
            PLAY_THEATER_GRID_VIEW_CLASS,
            PLAY_THEATER_GRID_VIEW_DESKTOP_CLASS,
          )}
        >
          {profileItems.map((item) => {
            const listItem = mapUserProfileDramaToListItem(item, {
              creatorNameFallback:
                tab === ProfilePageTab.Dramas
                  ? publishedCreatorDisplayName
                  : undefined,
            });
            if (!listItem) {
              return null;
            }

            return (
              <li key={listItem.dramaId ?? listItem.dramaTitle}>
                <PlayDramaCard
                  item={listItem}
                  canPlay={isProfileItemPlayable(item)}
                  onPlayBlocked={() => handleProfilePlayBlocked(item)}
                  onBeforePlay={handleProfileBeforePlay}
                />
              </li>
            );
          })}
        </ul>
      ) : (
        <ul
          className={cn(
            PLAY_THEATER_GRID_VIEW_CLASS,
            PLAY_THEATER_GRID_VIEW_DESKTOP_CLASS,
          )}
        >
          {profileItems.map((item) => (
            <li
              key={`${item.type ?? 'work'}-${item.episode?.episodeId ?? item.drama?.dramaId ?? item.actionTime}`}
            >
              <ProfileWorkCard
                item={item}
                creatorNameFallback={
                  tab === 'works' ? publishedCreatorDisplayName : undefined
                }
                variant={tab === 'works' ? 'works' : 'default'}
                onBeforePlay={handleProfileBeforePlay}
              />
            </li>
          ))}
        </ul>
      )}
      {hasNextPage ? (
        <div
          ref={ref}
          className={cn('flex justify-center py-6')}
          aria-hidden={!isFetchingNextPage}
        >
          {isFetchingNextPage ? (
            <Spinner className="size-6 text-muted-foreground" />
          ) : null}
        </div>
      ) : null}
    </AppLoadingContainer>
  );
}

function getProfileEmptyDescription(
  t: TFunction,
  tab: ProfileContentTab,
  isOwn: boolean,
) {
  if (!isOwn) {
    return t('暂无相关内容');
  }
  if (tab === 'dramas') {
    return t('暂无内容，去发布短剧吧～');
  }
  if (tab === 'works') {
    return t('暂无内容，去发布视频吧～');
  }
  if (tab === 'likes') {
    return t('暂无点赞，去发现有趣的内容吧～');
  }
  return t('暂无收藏，去发现有趣的内容吧～');
}

function ProfileEmptyState({
  tab,
  isOwn,
}: {
  tab: ProfileContentTab;
  isOwn: boolean;
}) {
  const { t } = useTranslation();
  const description = getProfileEmptyDescription(t, tab, isOwn);
  const action =
    isOwn && tab === 'dramas'
      ? { label: t('去发布'), to: '/create' as const }
      : isOwn && tab === 'works'
        ? { label: t('去发布'), to: '/create-short-video' as const }
        : isOwn && (tab === 'likes' || tab === 'favorites')
          ? { label: t('去看看'), to: '/' as const }
          : undefined;

  return (
    <>
      <div className="flex w-52 max-w-full flex-col items-center gap-4">
        <IconNoData className="size-22 shrink-0" />
        <p className="min-w-full text-center text-sm leading-5 font-normal text-muted-foreground">
          {description}
        </p>
      </div>
      {action ? (
        <Button
          className={cn(
            'h-auto rounded-xl px-8 py-2.5 text-sm leading-5 font-normal',
            'bg-foreground text-background hover:bg-foreground/90 hover:text-background',
          )}
          render={<Link to={action.to} />}
        >
          {action.label}
        </Button>
      ) : null}
    </>
  );
}

function ProfileWorkCard({
  item,
  creatorNameFallback,
  variant = 'default',
  onBeforePlay,
}: {
  item: UserProfileUnifiedResponse;
  creatorNameFallback?: string;
  variant?: 'works' | 'default';
  onBeforePlay?: () => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const dramaId = readSnowflakeId(item.drama?.dramaId);
  const episodeId = readSnowflakeId(item.episode?.episodeId);
  const coverImage = (item.episode?.coverUrl ?? item.drama?.coverUrl)?.trim();
  const description = getProfileWorkDescription(item);
  const isShortVideo = isProfileShortVideoItem(item);
  const playPathId = isShortVideo ? episodeId : dramaId;
  const isWorksLayout = variant === 'works';
  const showDramaMeta = !isShortVideo;
  const episodeNo = item.episode?.episodeNo;
  const episodeLabel =
    showDramaMeta && episodeNo != null
      ? t('第{{n}}集', { n: episodeNo })
      : undefined;
  const creatorName = item.creatorName?.trim() || creatorNameFallback?.trim();
  const creatorUserId = readSnowflakeId(item.userId);
  const creatorAvatarUrl = item.creatorAvatarUrl?.trim();
  const durationSec = readProfileWorkDurationSec(item);
  const likeCount = readProfileWorkLikeCount(item);

  const playSearch = playPathId
    ? {
        ...getPlayPlaylistNavigateSearch({
          dramaId: playPathId,
          episodeId,
          episodeNo: episodeNo ?? undefined,
          contentType: isShortVideo
            ? PlayFeedContentType.ShortVideo
            : undefined,
        }),
        commentId: undefined,
        sideTab: undefined,
      }
    : undefined;

  function handleCoverPlayClick() {
    if (!isProfileItemPlayable(item)) {
      toast.error(t(getCreationPlayBlockToastKey(getProfilePlayStatus(item))));
      return;
    }

    if (!playPathId || !playSearch) {
      return;
    }

    onBeforePlay?.();
    void navigate({
      to: '/play/$dramaId',
      params: { dramaId: playPathId },
      search: playSearch,
    });
  }

  const cover = (
    <div
      className={cn(
        'relative w-full overflow-hidden',
        PLAY_CARD_COVER_ASPECT_CLASS,
      )}
    >
      {coverImage ? (
        <img
          alt=""
          className={cn(
            'size-full object-cover transition-transform duration-300 ease-out',
            'group-hover:scale-[1.055]',
          )}
          decoding="async"
          height={620}
          loading="lazy"
          src={coverImage}
          width={464}
        />
      ) : (
        <div className="size-full bg-muted" />
      )}

      {playPathId && playSearch ? (
        <Button
          type="button"
          variant="ghost"
          className="absolute inset-0 z-[5] size-full rounded-none p-0 hover:bg-transparent"
          aria-label={description || undefined}
          onClick={handleCoverPlayClick}
        />
      ) : null}

      <ShortVideoCardCoverStats
        likeCount={likeCount}
        durationSec={durationSec}
        layout="profile"
      />
      {isProfileDramaEpisodeItem(item) ? (
        <ContentBadge
          badge={item.drama?.badge}
          variant="drama"
          shape="corner"
          className="pointer-events-none absolute top-0 left-0 z-10 max-w-full"
        />
      ) : null}
    </div>
  );

  const meta = (
    <div className="flex min-w-0 flex-1 flex-col gap-2 p-3">
      {description ? (
        <h2
          className={cn(
            'min-w-0 text-base leading-6 font-medium text-foreground',
            isShortVideo && !isWorksLayout
              ? 'line-clamp-2 wrap-anywhere'
              : 'truncate',
          )}
          title={description}
        >
          {description}
        </h2>
      ) : null}
      <div
        className={cn(
          'mt-auto flex min-w-0 items-center gap-2',
          showDramaMeta ? 'justify-between' : 'justify-start',
        )}
      >
        {showDramaMeta ? (
          episodeLabel ? (
            <span className="min-w-0 truncate text-xs leading-4 tracking-[0.04px] text-muted-foreground">
              {episodeLabel}
            </span>
          ) : (
            <span />
          )
        ) : null}
        {creatorName ? (
          <UserProfileAvatarLink
            userId={creatorUserId}
            className="flex min-w-0 shrink-0 items-center gap-1 text-xs leading-4 tracking-[0.04px] text-muted-foreground"
          >
            <UserProfileAvatar
              userId={creatorUserId}
              avatarUrl={creatorAvatarUrl}
              size={16}
              fallbackChar={getRoleAvatarFallback(creatorName)}
              className="size-4"
            />
            <span className="max-w-20 truncate">
              {formatCreatorAtHandle(creatorName)}
            </span>
          </UserProfileAvatarLink>
        ) : null}
      </div>
    </div>
  );

  return (
    <article
      className={cn(
        'group flex h-full w-full flex-col overflow-hidden rounded-[10px]',
        isWorksLayout
          ? 'border-[0.3px] border-theater-drama-card-border bg-theater-drama-card-surface text-card-foreground'
          : cn(
              'border border-border/70 bg-card text-card-foreground',
              'transition-[border-color,box-shadow,transform] duration-200 ease-out',
              'hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0px_16px_36px_rgba(0,0,0,0.16)]',
            ),
      )}
    >
      {cover}
      {meta}
    </article>
  );
}

function compareProfileWorkPublishTimeDesc(
  left: UserProfileUnifiedResponse,
  right: UserProfileUnifiedResponse,
): number {
  const leftTime = left.actionTime;
  const rightTime = right.actionTime;

  if (leftTime === undefined && rightTime === undefined) {
    return 0;
  }

  if (leftTime === undefined) {
    return 1;
  }

  if (rightTime === undefined) {
    return -1;
  }

  return rightTime - leftTime;
}

/** 作品卡文案：短视频和短剧剧集都只展示 episode.description。 */
function getProfileWorkDescription(item: UserProfileUnifiedResponse): string {
  return item.episode?.description?.trim() ?? '';
}
