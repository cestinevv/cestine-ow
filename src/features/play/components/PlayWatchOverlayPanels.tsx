import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { MouseEvent, ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import type { DramaInfo } from '@/api/__generated__/story/model/dramaInfo';
import type { DramaPlayResponse } from '@/api/__generated__/story/model/dramaPlayResponse';
import IconAlertTriangle from '@/assets/svg/IconAlertTriangle';
import IconChevronDown from '@/assets/svg/IconChevronDown';
import IconCommentMore from '@/assets/svg/IconCommentMore';
import IconHeartBroken from '@/assets/svg/IconHeartBroken';
import IconMoreArrow from '@/assets/svg/IconMoreArrow';
import IconPlayerPlay from '@/assets/svg/IconPlayerPlay';
import IconPlayRatingStar from '@/assets/svg/IconPlayRatingStar';
import IconWatchBookmarkFilled from '@/assets/svg/IconWatchBookmarkFilled';
import IconWatchComment from '@/assets/svg/IconWatchComment';
import IconWatchFollowCheck from '@/assets/svg/IconWatchFollowCheck';
import IconWatchFollowPlus from '@/assets/svg/IconWatchFollowPlus';
import IconWatchHeartFilled from '@/assets/svg/IconWatchHeartFilled';
import IconWatchShare from '@/assets/svg/IconWatchShare';
import { UserProfileAvatarCircle } from '@/components/common/UserProfileAvatar';
import { UserProfileAvatarLink } from '@/components/common/UserProfileAvatarLink';
import { UserProfileRouteLink } from '@/components/common/UserProfileRouteLink';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ContentBadge } from '@/features/badge/ContentBadge';
import { PlayWatchMoreSettingsDialog } from '@/features/play/components/PlayWatchMoreSettingsDialog';
import { usePlayRequireLogin } from '@/features/play/hooks/usePlayRequireLogin';
import { playWatchStopGestureBubble } from '@/features/play/hooks/usePlayWatchEpisodeGesture';
import { patchPlayFeedCreatorFollowedByMe } from '@/features/play/playFollowCache';
import {
  formatPlayAvgRating,
  formatPlayCompactCount,
  getPlayDramaInfoCreatorAvatarUrl,
  getPlayDramaInfoCreatorFollowedByMe,
  getPlayDramaInfoCreatorName,
  getPlayDramaInfoCreatorUserId,
} from '@/features/play/playFormat';
import { usePlayPlaylistStore } from '@/features/play/playPlaylistStore';
import { PlayPlaylistSource } from '@/features/play/types/playImmersive';
import { isProfileBlockedByMe } from '@/features/profile/profileBlockRelations';
import {
  fetchProfileBlockRelation,
  getProfileBlockRelationQueryKey,
  requestProfileBlock,
  requestProfileFollow,
  requestProfileUnfollow,
} from '@/features/profile/profileWalletApi';
import {
  UgcReportDialog,
  type UgcReportFormValue,
  type UgcReportSuccessFollowUp,
} from '@/features/ugc/components/UgcReportDialog';
import {
  fetchUgcReportTypes,
  getUgcReportTypesQueryKey,
  mapUgcReportReasonOptions,
  requestUgcReportDrama,
  requestUgcReportWork,
} from '@/features/ugc/ugcReportApi';
import useGlobalStore from '@/stores/global';
import { cn, formatCreatorAtHandle, readSnowflakeId } from '@/utils';

type PlayWatchInteractionRailProps = {
  dramaInfo?: DramaInfo;
  episodePlay?: DramaPlayResponse;
  favoriteCount?: number;
  likedByMe: boolean;
  favoritedByMe: boolean;
  isLikePending: boolean;
  isFavoritePending: boolean;
  onToggleLike: () => void;
  onOpenComment: () => void;
  onToggleFavorite: () => void;
  onShare: () => void;
  onNotInterested?: () => void;
  /** 作品举报成功并点「完成」后切到下一条（推荐 Feed 等） */
  onWorkReportDone?: () => void;
  showMoreEntry?: boolean;
  moreSettingsOpen?: boolean;
  onMoreSettingsOpenChange?: (open: boolean) => void;
  isCleanScreen?: boolean;
  onToggleCleanScreen?: () => void;
  continuousPlay?: boolean;
  onContinuousPlayChange?: (checked: boolean) => void;
  className?: string;
};

export function PlayWatchInteractionRail({
  dramaInfo,
  episodePlay,
  favoriteCount,
  likedByMe,
  favoritedByMe,
  isLikePending,
  isFavoritePending,
  onToggleLike,
  onOpenComment,
  onToggleFavorite,
  onShare,
  onNotInterested,
  onWorkReportDone,
  showMoreEntry = true,
  moreSettingsOpen,
  onMoreSettingsOpenChange,
  isCleanScreen = false,
  onToggleCleanScreen,
  continuousPlay = false,
  onContinuousPlayChange,
  className,
}: PlayWatchInteractionRailProps) {
  const { t } = useTranslation();
  const currentUserId = useGlobalStore((state) =>
    readSnowflakeId(state.userProfile?.userId),
  );
  const { isLogin, requireLogin } = usePlayRequireLogin();
  const queryClient = useQueryClient();
  const patchPlaylistCreatorFollowedByMe = usePlayPlaylistStore(
    (state) => state.patchCreatorFollowedByMe,
  );
  const playlistSource = usePlayPlaylistStore((state) => state.source);
  const feedFollowedByMe = getPlayDramaInfoCreatorFollowedByMe(dramaInfo);
  const [followedByMe, setFollowedByMe] = useState(feedFollowedByMe ?? false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [reduceRecommendationDone, setReduceRecommendationDone] =
    useState(false);
  const [creatorBlockDone, setCreatorBlockDone] = useState(false);

  const creatorName = getPlayDramaInfoCreatorName(dramaInfo);
  const creatorUserId = getPlayDramaInfoCreatorUserId(dramaInfo);
  const creatorAvatarUrl = getPlayDramaInfoCreatorAvatarUrl(dramaInfo);
  const reportCreatorUserId =
    creatorUserId ?? readSnowflakeId(episodePlay?.creatorId);
  const reportCreatorAvatarUrl =
    creatorAvatarUrl ?? episodePlay?.creatorAvatarUrl?.trim();
  const reportCreatorName =
    creatorName?.trim() ?? episodePlay?.creatorName?.trim() ?? '';
  const reportCoverUrl = useMemo(() => {
    const extendedDramaInfo = dramaInfo as
      | (DramaInfo & { coverImg?: string })
      | undefined;

    return (
      episodePlay?.coverUrl?.trim() ||
      dramaInfo?.coverUrl?.trim() ||
      extendedDramaInfo?.coverImg?.trim()
    );
  }, [dramaInfo, episodePlay]);
  const likeCount = episodePlay?.likeCount;
  const commentCount = episodePlay?.commentCount;
  const avatarFallback = creatorName?.slice(0, 1) ?? '?';
  const reportEpisodeId = readSnowflakeId(episodePlay?.episodeId);
  const reportDramaId =
    readSnowflakeId(episodePlay?.dramaId) ??
    readSnowflakeId(dramaInfo?.dramaId);
  const reportTarget = useMemo(() => {
    if (reportEpisodeId) {
      return {
        kind: 'work' as const,
        id: reportEpisodeId,
        scope: 'WORK' as const,
      };
    }

    if (reportDramaId) {
      return {
        kind: 'drama' as const,
        id: reportDramaId,
        scope: 'DRAMA' as const,
      };
    }

    return undefined;
  }, [reportDramaId, reportEpisodeId]);
  const { data: reportTypeItems, isLoading: isReportReasonsLoading } = useQuery(
    {
      queryKey: getUgcReportTypesQueryKey(reportTarget?.scope ?? 'WORK'),
      queryFn: ({ signal }) =>
        fetchUgcReportTypes(reportTarget?.scope ?? 'WORK', { signal }),
      enabled: reportOpen && !reportSubmitted && reportTarget !== undefined,
      retry: false,
    },
  );
  const reportReasonOptions = useMemo(
    () => mapUgcReportReasonOptions(reportTypeItems),
    [reportTypeItems],
  );
  const reportMutation = useMutation({
    mutationFn: (value: UgcReportFormValue) => {
      if (!reportTarget) {
        throw new Error('missing report target');
      }

      if (reportTarget.kind === 'work') {
        return requestUgcReportWork({
          episodeId: reportTarget.id,
          data: value,
        });
      }

      return requestUgcReportDrama({
        dramaId: reportTarget.id,
        data: value,
      });
    },
    onSuccess: () => {
      setReportSubmitted(true);
    },
  });
  // 自己的短剧不展示关注按钮；内容管理入口均为本人作品
  const isOwnDrama =
    (reportCreatorUserId !== undefined &&
      reportCreatorUserId === currentUserId) ||
    playlistSource === PlayPlaylistSource.Creation;
  const blockMutation = useMutation({
    mutationFn: () => requestProfileBlock(reportCreatorUserId ?? ''),
    onSuccess: () => {
      setCreatorBlockDone(true);
      toast.success(t('已拉黑'));
      if (reportCreatorUserId) {
        void queryClient.invalidateQueries({
          queryKey: getProfileBlockRelationQueryKey(reportCreatorUserId),
        });
      }
    },
  });
  const creatorBlockRelationQueryKey = getProfileBlockRelationQueryKey(
    reportCreatorUserId ?? '',
  );
  const { data: creatorBlockRelationResponse } = useQuery({
    queryKey: creatorBlockRelationQueryKey,
    queryFn: ({ signal }) =>
      fetchProfileBlockRelation(reportCreatorUserId ?? '', { signal }),
    enabled:
      isLogin &&
      reportOpen &&
      reportSubmitted &&
      reportCreatorUserId !== undefined &&
      !isOwnDrama,
    retry: false,
  });
  const creatorBlockedByMe =
    isProfileBlockedByMe(creatorBlockRelationResponse?.relation) ||
    creatorBlockDone;
  const reportSuccessFollowUps = useMemo<UgcReportSuccessFollowUp[]>(() => {
    const followUps: UgcReportSuccessFollowUp[] = [];

    if (reportCreatorUserId && !isOwnDrama) {
      followUps.push({
        id: 'block-creator',
        userId: reportCreatorUserId,
        avatarUrl: reportCreatorAvatarUrl,
        displayName: reportCreatorName,
        actionLabelKey: '拉黑',
        completedLabelKey: '已拉黑',
        completedVisual: 'outline',
        disabled: creatorBlockedByMe,
        onAction: () => {
          if (creatorBlockedByMe || blockMutation.isPending) {
            return;
          }

          blockMutation.mutate();
        },
        isPending: blockMutation.isPending,
      });
    }

    if (onNotInterested) {
      followUps.push({
        id: 'reduce-recommendation',
        coverUrl: reportCoverUrl,
        displayName:
          dramaInfo?.title?.trim() ?? episodePlay?.title?.trim() ?? '',
        actionLabelKey: '减少推荐',
        completedLabelKey: '已减少推荐',
        completedVisual: 'unavailable',
        disabled: reduceRecommendationDone,
        // toast 由父层 onNotInterested（如推荐流 dislike onSuccess）统一弹出，避免重复
        onAction: () => {
          if (reduceRecommendationDone) {
            return;
          }

          onNotInterested();
          setReduceRecommendationDone(true);
        },
      });
    }

    return followUps.filter((item) => item.displayName.length > 0);
  }, [
    blockMutation.isPending,
    blockMutation.mutate,
    creatorBlockedByMe,
    dramaInfo?.title,
    episodePlay?.title,
    isOwnDrama,
    onNotInterested,
    reduceRecommendationDone,
    reportCoverUrl,
    reportCreatorAvatarUrl,
    reportCreatorName,
    reportCreatorUserId,
  ]);

  const followMutation = useMutation({
    mutationFn: (nextFollowed: boolean) => {
      if (!creatorUserId) {
        throw new Error('missing creator');
      }

      return nextFollowed
        ? requestProfileFollow(creatorUserId)
        : requestProfileUnfollow(creatorUserId);
    },
    onSuccess: (_data, nextFollowed) => {
      setFollowedByMe(nextFollowed);
      patchPlayFeedCreatorFollowedByMe(queryClient, {
        creatorUserId,
        followedByMe: nextFollowed,
      });
      patchPlaylistCreatorFollowedByMe(creatorUserId, nextFollowed);
      toast.success(nextFollowed ? t('已关注') : t('已取消关注'));
    },
    onError: () => {
      toast.error(t('再试一次'));
    },
  });

  useEffect(() => {
    if (feedFollowedByMe === undefined) {
      return;
    }

    setFollowedByMe(feedFollowedByMe);
  }, [feedFollowedByMe]);

  // 创作者关注：未登录先弹登录；仅执行动作，不打开右侧面板；自己的作品直接忽略
  const handleToggleFollow = () => {
    if (isOwnDrama) {
      return;
    }

    if (!requireLogin()) {
      return;
    }

    if (!creatorUserId) {
      toast.error(t('再试一次'));
      return;
    }

    followMutation.mutate(!followedByMe);
  };

  // 未登录点头像：拦跳转并拉起登录弹窗
  const handleGuestAvatarClick = () => {
    requireLogin();
  };

  // 更多菜单：不感兴趣走父层跳过，无回调时仅提示
  const handleNotInterested = () => {
    if (onNotInterested) {
      onNotInterested();
      return;
    }

    toast.success(t('已反馈，将减少此类内容推荐'));
  };

  // 更多菜单：打开 UGC 举报弹窗（作品优先，无单集时举报短剧）
  const handleReport = () => {
    if (!requireLogin()) {
      return;
    }

    if (!reportTarget) {
      toast.error(t('再试一次'));
      return;
    }

    setReportSubmitted(false);
    setReduceRecommendationDone(false);
    setCreatorBlockDone(false);
    setReportOpen(true);
  };

  function handleCloseReportDone() {
    const shouldAdvanceAfterWorkReport =
      reportSubmitted && reportTarget?.kind === 'work';

    setReportOpen(false);
    setReportSubmitted(false);
    setReduceRecommendationDone(false);
    setCreatorBlockDone(false);

    if (shouldAdvanceAfterWorkReport) {
      onWorkReportDone?.();
    }
  }

  return (
    <>
      <aside
        aria-label={t('作品互动')}
        className={cn(
          // Layout — Figma 6:1105：64 宽栏，头像组与动作组间距 30
          'pointer-events-auto flex w-16 shrink-0 flex-col items-center',
          // Spacing — 右/下各 16，贴视频右下沿
          'gap-[30px] pb-4 pr-4',
          className,
        )}
      >
        <div
          className={cn(
            // Layout — Figma 9:690 Overlay+OverlayBlur：48 圆，头像 44 + 负边距叠 18 关注钮
            'relative flex size-12 shrink-0 flex-col items-center',
            'overflow-visible rounded-full backdrop-blur-[10px]',
          )}
        >
          {creatorUserId !== undefined ? (
            isLogin ? (
              <UserProfileAvatarLink
                userId={creatorUserId}
                allowSelfNavigate
                className={cn(
                  // Figma 9:691：-mb-2.5（10px）让红加号压住头像底边
                  'relative z-0 -mb-2.5 flex size-11 shrink-0 items-center justify-center',
                  'transition-opacity hover:opacity-90',
                )}
              >
                <PlayWatchRailAvatar
                  userId={creatorUserId}
                  avatarUrl={creatorAvatarUrl}
                  fallback={avatarFallback}
                />
              </UserProfileAvatarLink>
            ) : (
              <Button
                type="button"
                variant="ghost"
                aria-label={t('登录/注册')}
                onClick={handleGuestAvatarClick}
                className={cn(
                  // 与已登录头像同尺寸，未登录点击只拉登录弹窗
                  'relative z-0 -mb-2.5 flex size-11 shrink-0 items-center justify-center',
                  'rounded-full p-0 transition-opacity hover:bg-transparent hover:opacity-90',
                )}
              >
                <PlayWatchRailAvatar
                  userId={creatorUserId}
                  avatarUrl={creatorAvatarUrl}
                  fallback={avatarFallback}
                />
              </Button>
            )
          ) : (
            <div className="relative z-0 -mb-2.5 size-11 shrink-0">
              <PlayWatchRailAvatar
                userId={creatorUserId}
                avatarUrl={creatorAvatarUrl}
                fallback={avatarFallback}
              />
            </div>
          )}
          {creatorUserId !== undefined && !isOwnDrama ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              disabled={followMutation.isPending}
              onClick={handleToggleFollow}
              aria-label={followedByMe ? t('已关注') : t('关注')}
              className={cn(
                // Figma 9:694：18 圆钮（p-0.75 + 12 图标），叠在头像底边中央
                'relative z-10 size-4.5 shrink-0 rounded-full p-0.75',
                followedByMe
                  ? 'bg-black/80 text-white hover:bg-black/80'
                  : 'bg-watch-follow-primary text-white hover:bg-watch-follow-primary/90',
              )}
            >
              {followedByMe ? (
                <IconWatchFollowCheck className="size-3" />
              ) : (
                <IconWatchFollowPlus className="size-3" />
              )}
            </Button>
          ) : null}
        </div>

        <div className={cn('flex flex-col items-center gap-5')}>
          <div className={cn('flex flex-col items-center gap-[18px]')}>
            <PlayWatchRailAction
              label={formatPlayCompactCount(likeCount ?? 0) ?? '0'}
              disabled={isLikePending}
              onClick={onToggleLike}
            >
              <PlayWatchRailIcon>
                {likedByMe ? (
                  <IconWatchHeartFilled className="size-full text-watch-like-active" />
                ) : (
                  // Figma 6:1105 默认态为实心白心
                  <IconWatchHeartFilled className="size-full text-white" />
                )}
              </PlayWatchRailIcon>
            </PlayWatchRailAction>

            <PlayWatchRailAction
              label={formatPlayCompactCount(commentCount ?? 0) ?? '0'}
              onClick={onOpenComment}
            >
              <PlayWatchRailIcon>
                <IconWatchComment className="size-full text-white" />
              </PlayWatchRailIcon>
            </PlayWatchRailAction>

            <PlayWatchRailAction
              label={formatPlayCompactCount(favoriteCount ?? 0) ?? '0'}
              disabled={isFavoritePending}
              onClick={onToggleFavorite}
            >
              <PlayWatchRailIcon>
                {favoritedByMe ? (
                  <IconWatchBookmarkFilled className="size-full text-watch-bookmark-active" />
                ) : (
                  // Figma 6:1105 默认态为实心白书签
                  <IconWatchBookmarkFilled className="size-full text-white" />
                )}
              </PlayWatchRailIcon>
            </PlayWatchRailAction>

            <PlayWatchRailAction label={t('分享')} onClick={onShare}>
              <PlayWatchRailIcon>
                <IconWatchShare className="size-full text-white" />
              </PlayWatchRailIcon>
            </PlayWatchRailAction>
          </div>

          {/* 自己的作品：隐藏「更多」入口，保留 size-6 占位以免右侧栏高度跳动 */}
          {showMoreEntry ? (
            isOwnDrama ? (
              <div className="size-6 shrink-0" aria-hidden />
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label={t('更多')}
                  className={cn(
                    'inline-flex size-6 items-center justify-center rounded-none',
                    'text-white outline-none',
                    'hover:opacity-90',
                  )}
                >
                  <IconCommentMore className="size-6 drop-shadow-[0_1px_4px_rgba(0,0,0,0.08)]" />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  side="left"
                  sideOffset={14}
                  className={cn(
                    // Layout — Figma「更多」80:97897 纵向列表浮层
                    'flex w-auto min-w-0 flex-col items-stretch gap-0 overflow-hidden p-0',
                    // Visual
                    'rounded-2xl border-0 bg-site-settings-panel-surface ring-0',
                    'shadow-[1px_5px_20px_0_rgba(0,0,0,0.13)]',
                  )}
                >
                  <DropdownMenuItem
                    onClick={handleNotInterested}
                    className={cn(
                      // Layout & Spacing — 行内图标 + 文案，p 16 / gap 12
                      'flex h-auto cursor-pointer items-center justify-start gap-3 rounded-none px-4 py-4',
                      // Visual
                      'text-sm leading-5 text-muted-foreground',
                      // State — hover/高亮时文案与 icon 同色（覆盖默认 focus 拆色）
                      'data-highlighted:bg-accent data-highlighted:text-accent-foreground',
                      'data-highlighted:**:text-accent-foreground',
                      'focus:bg-accent focus:text-accent-foreground focus:**:text-accent-foreground',
                    )}
                  >
                    <IconHeartBroken aria-hidden className="size-6 shrink-0" />
                    {t('不感兴趣')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleReport}
                    className={cn(
                      'flex h-auto cursor-pointer items-center justify-start gap-3 rounded-none px-4 py-4',
                      'text-sm leading-5 text-muted-foreground',
                      'data-highlighted:bg-accent data-highlighted:text-accent-foreground',
                      'data-highlighted:**:text-accent-foreground',
                      'focus:bg-accent focus:text-accent-foreground focus:**:text-accent-foreground',
                    )}
                  >
                    <IconAlertTriangle
                      aria-hidden
                      className="size-6 shrink-0"
                    />
                    {t('举报')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )
          ) : null}
        </div>
      </aside>
      {moreSettingsOpen !== undefined &&
      onMoreSettingsOpenChange &&
      onToggleCleanScreen &&
      onContinuousPlayChange ? (
        <PlayWatchMoreSettingsDialog
          open={moreSettingsOpen}
          onOpenChange={onMoreSettingsOpenChange}
          onNotInterested={handleNotInterested}
          onReport={handleReport}
          isCleanScreen={isCleanScreen}
          onToggleCleanScreen={onToggleCleanScreen}
          continuousPlay={continuousPlay}
          onContinuousPlayChange={onContinuousPlayChange}
          showFeedbackActions={!isOwnDrama}
        />
      ) : null}
      <UgcReportDialog
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
    </>
  );
}

type PlayWatchMetaPanelProps = {
  dramaInfo?: DramaInfo;
  currentEpisode: number;
  totalEpisodes?: number;
  synopsisText: string;
  isExpanded: boolean;
  /** 推荐流多集短剧：展示「观看完整短剧」 */
  showSeriesCtas?: boolean;
  showEpisodeLabel?: boolean;
  /** 短视频：标题位改为 @作者 >，点击进资料页 */
  titleAsCreatorProfile?: boolean;
  onToggleExpanded: () => void;
  onTitleClick?: () => void;
  onWatchFullSeries?: () => void;
  className?: string;
};

const PLAY_WATCH_META_TITLE_CLASS = cn(
  'text-lg leading-[26px] font-semibold tracking-[-0.04px] text-white',
  'text-shadow-[0_1px_8px_rgba(0,0,0,0.08)]',
);

export function PlayWatchMetaPanel({
  dramaInfo,
  currentEpisode,
  totalEpisodes = 0,
  synopsisText,
  isExpanded,
  showSeriesCtas = false,
  showEpisodeLabel = true,
  titleAsCreatorProfile = false,
  onToggleExpanded,
  onTitleClick,
  onWatchFullSeries,
  className,
}: PlayWatchMetaPanelProps) {
  const { t } = useTranslation();
  const { isLogin, requireLogin } = usePlayRequireLogin();
  const synopsisRef = useRef<HTMLParagraphElement>(null);
  const [canExpandSynopsis, setCanExpandSynopsis] = useState(false);

  const creatorName = getPlayDramaInfoCreatorName(dramaInfo);
  const creatorUserId = getPlayDramaInfoCreatorUserId(dramaInfo);
  const title = titleAsCreatorProfile
    ? creatorName
      ? formatCreatorAtHandle(creatorName)
      : ''
    : (dramaInfo?.title?.trim() ?? '');
  const ratingLabel = formatPlayAvgRating(
    dramaInfo?.avgRating,
    dramaInfo?.totalRatingUserCount,
  );
  const synopsisLabel = synopsisText
    ? showEpisodeLabel
      ? t('第{{n}}集：{{synopsis}}', {
          n: currentEpisode,
          synopsis: synopsisText,
        })
      : synopsisText
    : '';

  // 仅单行截断时显示展开；已展开时保留收起入口
  useEffect(() => {
    const el = synopsisRef.current;

    if (!el || !synopsisLabel) {
      setCanExpandSynopsis(false);
      return;
    }

    function measureOverflow() {
      if (!synopsisRef.current) {
        return;
      }

      const node = synopsisRef.current;

      // 收起态用 truncate 测溢出；展开态保持按钮可见以便收起
      if (isExpanded) {
        setCanExpandSynopsis(true);
        return;
      }

      setCanExpandSynopsis(node.scrollWidth > node.clientWidth + 1);
    }

    measureOverflow();

    const resizeObserver = new ResizeObserver(() => {
      measureOverflow();
    });

    resizeObserver.observe(el);

    return () => {
      resizeObserver.disconnect();
    };
  }, [synopsisLabel, isExpanded]);

  // 观看完整短剧：进入短剧二级播放页
  const handleWatchFullSeries = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onWatchFullSeries?.();
  };

  // 展开或收起底部简介
  const handleToggleExpanded = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onToggleExpanded();
  };

  // 短视频标题跳资料页：阻断冒泡，避免触发播放器点击
  const handleCreatorTitleNavigate = (event: MouseEvent<HTMLAnchorElement>) => {
    event.stopPropagation();
  };

  // 未登录点 @作者：拦跳转并拉起登录弹窗
  const handleGuestCreatorTitleClick = (
    event: MouseEvent<HTMLButtonElement>,
  ) => {
    event.stopPropagation();
    requireLogin();
  };

  // 短剧标题打开详情 Tab
  const handleDramaTitleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onTitleClick?.();
  };

  const creatorTitleContent = (
    <span className="inline-flex min-w-0 max-w-full items-center gap-2">
      <span className="min-w-0 truncate">{title}</span>
      <IconMoreArrow aria-hidden className="h-3.5 w-1.5 shrink-0 text-white" />
    </span>
  );

  return (
    <div
      className={cn(
        'pointer-events-none flex min-w-0 w-full max-w-[460px] flex-col',
        'gap-1',
        className,
      )}
    >
      <ContentBadge badge={dramaInfo?.badge} variant="drama" />

      {title ? (
        <h2 className="m-0 min-w-0">
          {titleAsCreatorProfile && creatorUserId ? (
            isLogin ? (
              <UserProfileRouteLink
                userId={creatorUserId}
                onClick={handleCreatorTitleNavigate}
                title={creatorName}
                className={cn(
                  'pointer-events-auto inline-flex h-auto max-w-full',
                  'text-left',
                  PLAY_WATCH_META_TITLE_CLASS,
                  'hover:text-white hover:opacity-90',
                )}
              >
                {creatorTitleContent}
              </UserProfileRouteLink>
            ) : (
              <Button
                type="button"
                variant="ghost"
                onClick={handleGuestCreatorTitleClick}
                title={creatorName}
                className={cn(
                  'pointer-events-auto h-auto max-w-full rounded-none p-0',
                  'text-left',
                  PLAY_WATCH_META_TITLE_CLASS,
                  'hover:bg-transparent hover:text-white hover:opacity-90',
                )}
              >
                {creatorTitleContent}
              </Button>
            )
          ) : titleAsCreatorProfile ? (
            <span
              className={cn('block truncate', PLAY_WATCH_META_TITLE_CLASS)}
              title={creatorName}
            >
              {title}
            </span>
          ) : onTitleClick ? (
            <Button
              type="button"
              variant="ghost"
              onClick={handleDramaTitleClick}
              className={cn(
                'pointer-events-auto h-auto max-w-full rounded-none p-0',
                'text-left',
                PLAY_WATCH_META_TITLE_CLASS,
                'hover:bg-transparent hover:text-white hover:opacity-90',
              )}
            >
              <span className="inline-flex min-w-0 max-w-full items-center gap-2">
                <span className="min-w-0 truncate">{title}</span>
                <IconMoreArrow
                  aria-hidden
                  className="h-3.5 w-1.5 shrink-0 text-white"
                />
              </span>
            </Button>
          ) : (
            <span className={cn('block truncate', PLAY_WATCH_META_TITLE_CLASS)}>
              {title}
            </span>
          )}
        </h2>
      ) : null}

      {ratingLabel ? (
        <div
          className={cn(
            'pointer-events-auto flex items-center gap-1',
            'select-text',
          )}
        >
          <IconPlayRatingStar className="size-[18px] text-play-rating-star" />
          <span className={cn('text-sm leading-5 text-play-rating-star')}>
            {ratingLabel}
          </span>
        </div>
      ) : null}

      {synopsisText ? (
        <div
          data-play-watch-no-swipe
          onPointerDown={playWatchStopGestureBubble}
          onTouchStart={playWatchStopGestureBubble}
          className={cn(
            // Layout — 始终可点选，避免收起态 pointer-events-none 导致简介无法划选
            'pointer-events-auto flex items-start gap-2.5',
            isExpanded ? 'relative z-40' : '',
          )}
        >
          <section
            data-play-watch-scroll={isExpanded ? '' : undefined}
            className={cn(
              'min-w-0 flex-1 select-text',
              isExpanded
                ? 'max-h-[38dvh] touch-pan-y overflow-y-auto overscroll-contain'
                : '',
            )}
            onClick={(event) => {
              event.stopPropagation();
            }}
            onKeyDown={(event) => {
              event.stopPropagation();
            }}
            aria-label={t('剧集简介')}
          >
            <p
              ref={synopsisRef}
              className={cn(
                'text-sm leading-5 text-white/80',
                'text-shadow-[0_1px_8px_rgba(0,0,0,0.08)]',
                isExpanded ? '' : 'truncate',
              )}
            >
              {synopsisLabel}
            </p>
          </section>
          {canExpandSynopsis || isExpanded ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={handleToggleExpanded}
              className={cn(
                'pointer-events-auto size-6 shrink-0 rounded-full p-0',
                'text-white hover:bg-white/10 hover:text-white',
              )}
              aria-label={isExpanded ? t('收起') : t('展开')}
            >
              <IconChevronDown
                className={cn('size-6', isExpanded ? 'rotate-180' : '')}
              />
            </Button>
          ) : null}
        </div>
      ) : null}

      {showSeriesCtas && totalEpisodes > 1 ? (
        <div
          className={cn('pointer-events-auto flex flex-wrap items-start gap-2')}
        >
          <Button
            type="button"
            variant="ghost"
            onClick={handleWatchFullSeries}
            className={cn(
              // Layout
              'inline-flex h-auto items-center gap-1',
              // Spacing
              'rounded-lg px-3 py-2',
              // Visual
              'bg-play-meta-cta-bg text-[13px] font-medium leading-[18px] text-white',
              // State
              'hover:bg-white/30 hover:text-white',
            )}
          >
            <IconPlayerPlay className="size-4 shrink-0" />
            {t('观看完整短剧 · 全{{count}}集', { count: totalEpisodes })}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function PlayWatchRailAvatar({
  userId,
  avatarUrl,
  fallback,
}: {
  userId?: string;
  avatarUrl?: string;
  fallback: string;
}) {
  return (
    <div
      className={cn(
        // Figma 9:691：白描边放在 overflow 外层，避免被 Avatar 容器裁切
        'relative size-11 shrink-0 rounded-full',
        'ring-1 ring-white',
        'drop-shadow-[0_1px_4px_rgba(0,0,0,0.08)]',
      )}
    >
      <UserProfileAvatarCircle
        userId={userId}
        avatarUrl={avatarUrl}
        size={44}
        fallbackChar={fallback}
        containerClassName="size-full"
      />
    </div>
  );
}

function PlayWatchRailIcon({ children }: { children: ReactNode }) {
  return (
    <span
      className={cn(
        'flex size-[26px] items-center justify-center',
        'drop-shadow-[0_0.722px_2.889px_rgba(0,0,0,0.08)]',
      )}
    >
      {children}
    </span>
  );
}

function PlayWatchRailAction({
  children,
  label,
  disabled,
  onClick,
}: {
  children: ReactNode;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <div className={cn('flex flex-col items-center', 'gap-2')}>
      <Button
        type="button"
        variant="ghost"
        disabled={disabled}
        onClick={onClick}
        className={cn(
          'h-auto min-h-0 rounded-none p-0',
          // 避免 Button 默认把无 size-* 的 svg 压成 12px
          '[&_svg]:size-[26px]',
          'hover:bg-transparent active:bg-transparent',
        )}
      >
        {children}
      </Button>
      <span
        className={cn(
          'whitespace-nowrap text-center text-sm leading-5',
          'text-white text-shadow-[0_1px_8px_rgba(0,0,0,0.08)]',
        )}
      >
        {label}
      </span>
    </div>
  );
}
