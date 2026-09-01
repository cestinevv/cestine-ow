import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import type { DramaEpisodeListItemResponse } from '@/api/__generated__/story/model/dramaEpisodeListItemResponse';
import type { DramaInfo } from '@/api/__generated__/story/model/dramaInfo';
import IconAlertTriangle from '@/assets/svg/IconAlertTriangle';
import IconCommentMore from '@/assets/svg/IconCommentMore';
import IconPlayBookmarkFilled from '@/assets/svg/IconPlayBookmarkFilled';
import IconPlayBookmarkOutline from '@/assets/svg/IconPlayBookmarkOutline';
import IconPlayerPlay from '@/assets/svg/IconPlayerPlay';
import IconPlayHeartOutline from '@/assets/svg/IconPlayHeartOutline';
import IconPlayRatingStar from '@/assets/svg/IconPlayRatingStar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ContentBadge } from '@/features/badge/ContentBadge';
import { usePlayDramaRating } from '@/features/play/hooks/usePlayDramaRating';
import { usePlayRequireLogin } from '@/features/play/hooks/usePlayRequireLogin';
import {
  formatPlayAvgRating,
  formatPlayCompactCount,
  formatPlayHeatValue,
  getPlayDramaInfoCreatorAvatarUrl,
  getPlayDramaInfoCreatorName,
  getPlayDramaInfoCreatorUserId,
  hasPlayAvgRating,
} from '@/features/play/playFormat';
import { PlayImmersiveLayoutVariant } from '@/features/play/types/playImmersive';
import { isProfileBlockedByMe } from '@/features/profile/profileBlockRelations';
import {
  fetchProfileBlockRelation,
  getProfileBlockRelationQueryKey,
  requestProfileBlock,
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
} from '@/features/ugc/ugcReportApi';
import useGlobalStore from '@/stores/global';
import { cn, formatNumber, readSnowflakeId } from '@/utils';

type PlayImmersiveDramaTabProps = {
  layoutVariant: PlayImmersiveLayoutVariant;
  dramaId: string;
  dramaInfo?: DramaInfo;
  totalEpisodes: number;
  episodes?: DramaEpisodeListItemResponse[];
  currentEpisode: number;
  /** 短剧 Tab 是否可见；用于切回 / 首屏布局完成后再滚到当前集 */
  isActive?: boolean;
  /** 整剧收藏态（短剧 Tab 头图书签） */
  dramaFavoritedByMe?: boolean;
  isDramaFavoritePending?: boolean;
  creatorUserId?: string;
  onToggleDramaFavorite?: () => void;
  onNotInterested?: () => void;
  onSelectEpisode: (episode: number) => void;
  /**
   * 分集点赞数只读展示。
   * 合并播放栏 likeOverlays / 当前集详情，保证点赞后列表数字即时更新。
   */
  resolveEpisodeLikeCount?: (
    episodeId: string | undefined,
    listLikeCount?: number,
  ) => number | undefined;
};

/** 简介折叠区两行高度（15px/22px × 2） */
const PLAY_DRAMA_SYNOPSIS_COLLAPSED_HEIGHT_PX = 44;

/** 右栏「短剧」Tab — 对齐 Figma 推荐-短剧 详情拆分 */
export function PlayImmersiveDramaTab({
  layoutVariant,
  dramaId,
  dramaInfo,
  totalEpisodes,
  episodes,
  currentEpisode,
  isActive = true,
  dramaFavoritedByMe = false,
  isDramaFavoritePending = false,
  creatorUserId,
  onToggleDramaFavorite,
  onNotInterested,
  onSelectEpisode,
  resolveEpisodeLikeCount,
}: PlayImmersiveDramaTabProps) {
  const { t } = useTranslation();
  const currentUserId = useGlobalStore((state) =>
    readSnowflakeId(state.userProfile?.userId),
  );
  const { isLogin, requireLogin } = usePlayRequireLogin();
  const queryClient = useQueryClient();
  const isFullscreen = layoutVariant === PlayImmersiveLayoutVariant.Fullscreen;
  const [isSynopsisExpanded, setIsSynopsisExpanded] = useState(false);
  const [canToggleSynopsis, setCanToggleSynopsis] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [reduceRecommendationDone, setReduceRecommendationDone] =
    useState(false);
  const [creatorBlockDone, setCreatorBlockDone] = useState(false);
  const synopsisMeasureRef = useRef<HTMLParagraphElement>(null);
  const isSynopsisExpandedRef = useRef(false);
  const episodeListRef = useRef<HTMLUListElement>(null);
  const currentEpisodeItemRef = useRef<HTMLLIElement>(null);
  const ratingCreatorUserId =
    creatorUserId ?? getPlayDramaInfoCreatorUserId(dramaInfo);
  const reportCreatorAvatarUrl = getPlayDramaInfoCreatorAvatarUrl(dramaInfo);
  const reportCreatorName =
    getPlayDramaInfoCreatorName(dramaInfo)?.trim() ?? '';
  const { myRating, isRatingPending, submitRating } = usePlayDramaRating(
    dramaId,
    ratingCreatorUserId,
  );
  const isOwnDrama =
    ratingCreatorUserId !== undefined && ratingCreatorUserId === currentUserId;
  const { data: reportTypeItems, isLoading: isReportReasonsLoading } = useQuery(
    {
      queryKey: getUgcReportTypesQueryKey('DRAMA'),
      queryFn: ({ signal }) => fetchUgcReportTypes('DRAMA', { signal }),
      enabled: reportOpen && !reportSubmitted && dramaId.length > 0,
      retry: false,
    },
  );
  const reportReasonOptions = useMemo(
    () => mapUgcReportReasonOptions(reportTypeItems),
    [reportTypeItems],
  );
  const reportMutation = useMutation({
    mutationFn: (value: UgcReportFormValue) => {
      if (!dramaId) {
        throw new Error('missing drama id');
      }

      return requestUgcReportDrama({
        dramaId,
        data: value,
      });
    },
    onSuccess: () => {
      setReportSubmitted(true);
    },
  });
  const blockMutation = useMutation({
    mutationFn: () => requestProfileBlock(ratingCreatorUserId ?? ''),
    onSuccess: () => {
      setCreatorBlockDone(true);
      toast.success(t('已拉黑'));
      if (ratingCreatorUserId) {
        void queryClient.invalidateQueries({
          queryKey: getProfileBlockRelationQueryKey(ratingCreatorUserId),
        });
      }
    },
  });
  const { data: creatorBlockRelationResponse } = useQuery({
    queryKey: getProfileBlockRelationQueryKey(ratingCreatorUserId ?? ''),
    queryFn: ({ signal }) =>
      fetchProfileBlockRelation(ratingCreatorUserId ?? '', { signal }),
    enabled:
      isLogin &&
      reportOpen &&
      reportSubmitted &&
      ratingCreatorUserId !== undefined &&
      !isOwnDrama,
    retry: false,
  });
  const creatorBlockedByMe =
    isProfileBlockedByMe(creatorBlockRelationResponse?.relation) ||
    creatorBlockDone;
  const reportCoverUrl =
    dramaInfo?.coverImg?.trim() ?? dramaInfo?.coverUrl?.trim();
  const reportSuccessFollowUps = useMemo<UgcReportSuccessFollowUp[]>(() => {
    const followUps: UgcReportSuccessFollowUp[] = [];

    if (ratingCreatorUserId && !isOwnDrama) {
      followUps.push({
        id: 'block-creator',
        userId: ratingCreatorUserId,
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
        displayName: dramaInfo?.title?.trim() ?? '',
        actionLabelKey: '减少推荐',
        completedLabelKey: '已减少推荐',
        completedVisual: 'unavailable',
        disabled: reduceRecommendationDone,
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
    isOwnDrama,
    onNotInterested,
    reduceRecommendationDone,
    reportCoverUrl,
    reportCreatorAvatarUrl,
    reportCreatorName,
    ratingCreatorUserId,
  ]);

  const title = dramaInfo?.title?.trim() ?? '';
  const coverImage = dramaInfo?.coverImg?.trim();
  const synopsisText = dramaInfo?.desc?.trim() ?? '';
  const synopsisLabel = synopsisText
    ? t('简介：{{synopsis}}', { synopsis: synopsisText })
    : '';
  const ratingLabel = formatPlayAvgRating(
    dramaInfo?.avgRating,
    dramaInfo?.totalRatingUserCount,
  );
  const hasAvgRating = hasPlayAvgRating(
    dramaInfo?.avgRating,
    dramaInfo?.totalRatingUserCount,
  );
  const tags = dramaInfo?.tags ?? [];
  const completedLabel = formatPlayCompactCount(
    dramaInfo?.totalCompletedViewCount,
  );
  const heatLabel = formatPlayHeatValue(dramaInfo?.totalHeatValue);

  isSynopsisExpandedRef.current = isSynopsisExpanded;

  useLayoutEffect(() => {
    setIsSynopsisExpanded(false);
    setCanToggleSynopsis(false);

    const measureElement = synopsisMeasureRef.current;

    if (!measureElement || !synopsisLabel) {
      return;
    }

    const measureSynopsisOverflow = () => {
      if (isSynopsisExpandedRef.current) {
        return;
      }

      setCanToggleSynopsis(
        measureElement.scrollHeight >
          PLAY_DRAMA_SYNOPSIS_COLLAPSED_HEIGHT_PX + 1,
      );
    };

    measureSynopsisOverflow();

    const resizeObserver = new ResizeObserver(measureSynopsisOverflow);
    resizeObserver.observe(measureElement);

    return () => {
      resizeObserver.disconnect();
    };
  }, [synopsisLabel]);

  const episodeRows =
    episodes && episodes.length > 0
      ? episodes
      : Array.from({ length: totalEpisodes }, (_, index) => ({
          episodeNo: index + 1,
        }));

  // 当前播放集滚到列表可视区顶部，避免进第 N 集时仍停在第 1 集
  // biome-ignore lint/correctness/useExhaustiveDependencies: 换剧或分集列表异步到齐后需再滚一次
  useLayoutEffect(() => {
    if (!isActive || currentEpisode < 1) {
      return;
    }

    const scrollCurrentEpisodeToTop = () => {
      const list = episodeListRef.current;
      const item = currentEpisodeItemRef.current;

      if (!list || !item || list.clientHeight <= 0) {
        return false;
      }

      list.scrollTop +=
        item.getBoundingClientRect().top - list.getBoundingClientRect().top;

      return true;
    };

    if (scrollCurrentEpisodeToTop()) {
      return;
    }

    // Tab 刚切回或列表尚未完成布局时，下一帧再滚一次
    const rafId = window.requestAnimationFrame(() => {
      scrollCurrentEpisodeToTop();
    });

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [currentEpisode, dramaId, episodeRows.length, isActive]);

  // 短剧 Tab 五星逐颗可点，直接提交评分
  const handleSelectRating = (score: number) => () => {
    submitRating(score);
  };

  // 展开 / 收起短剧简介
  const handleToggleSynopsis = () => {
    setIsSynopsisExpanded((value) => !value);
  };

  // 在当前播放器内切集，不离开沉浸页
  const handleSelectEpisode = (episode: number) => () => {
    onSelectEpisode(episode);
  };

  // 短剧 Tab 头图：整剧收藏
  const handleToggleDramaFavorite = () => {
    onToggleDramaFavorite?.();
  };

  // 短剧 Tab 更多：举报整剧（DRAMA scope）
  const handleOpenDramaReport = () => {
    if (!requireLogin()) {
      return;
    }

    if (!dramaId) {
      toast.error(t('再试一次'));
      return;
    }

    setReportSubmitted(false);
    setReduceRecommendationDone(false);
    setCreatorBlockDone(false);
    setReportOpen(true);
  };

  function handleCloseReportDone() {
    setReportOpen(false);
    setReportSubmitted(false);
    setReduceRecommendationDone(false);
    setCreatorBlockDone(false);
  }

  return (
    <>
      <div className={cn('flex min-h-0 flex-1 flex-col')}>
        <div className={cn('flex flex-col gap-3 p-4')}>
          <div className={cn('flex items-start gap-2')}>
            <div className={cn('flex min-w-0 flex-1 items-center gap-2')}>
              {coverImage ? (
                <img
                  alt=""
                  src={coverImage}
                  className="h-[108px] w-[81px] shrink-0 rounded-md object-cover"
                />
              ) : (
                <div className="h-[108px] w-[81px] shrink-0 rounded-md bg-muted" />
              )}
              <div
                className={cn(
                  'flex min-w-0 flex-1 flex-col justify-center gap-3',
                )}
              >
                <ContentBadge badge={dramaInfo?.badge} variant="drama" />
                {title ? (
                  <h2
                    className={cn(
                      'truncate text-base font-bold leading-6 text-foreground',
                    )}
                  >
                    {title}
                  </h2>
                ) : null}
                <ul className={cn('flex list-none flex-wrap gap-1.5 p-0')}>
                  <li
                    className={cn(
                      'inline-flex items-center gap-1 rounded border border-border',
                      'bg-muted px-2 py-1',
                    )}
                  >
                    <IconPlayRatingStar className="size-4 text-amber-400" />
                    <span className="text-xs leading-4 tracking-[0.04px] text-foreground">
                      {hasAvgRating ? ratingLabel : t('无')}
                    </span>
                  </li>
                  {tags.slice(0, 2).map((tag) => (
                    <li
                      key={tag}
                      className={cn(
                        'inline-flex rounded border border-border bg-muted px-2 py-1',
                        'text-xs leading-4 tracking-[0.04px] text-foreground',
                      )}
                    >
                      {tag}
                    </li>
                  ))}
                  {totalEpisodes > 0 ? (
                    <li
                      className={cn(
                        'inline-flex rounded border border-border bg-muted px-2 py-1',
                        'text-xs leading-4 tracking-[0.04px] text-foreground',
                      )}
                    >
                      {t('全{{count}}集', { count: totalEpisodes })}
                    </li>
                  ) : null}
                </ul>
              </div>
            </div>

            <div className={cn('flex shrink-0 items-start gap-2')}>
              {onToggleDramaFavorite ? (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={isDramaFavoritePending}
                  aria-label={
                    title
                      ? t('收藏《{{dramaName}}》', { dramaName: title })
                      : t('收藏')
                  }
                  aria-pressed={dramaFavoritedByMe}
                  onClick={handleToggleDramaFavorite}
                  className={cn(
                    // Layout — Figma 1003:135903 标题旁书签
                    'size-6 shrink-0 rounded-none p-0',
                    'hover:bg-transparent',
                  )}
                >
                  {dramaFavoritedByMe ? (
                    <IconPlayBookmarkFilled className="size-6 text-watch-bookmark-active drop-shadow-[0_0.667px_2.667px_rgba(0,0,0,0.08)]" />
                  ) : (
                    <IconPlayBookmarkOutline className="size-6 text-foreground drop-shadow-[0_0.667px_2.667px_rgba(0,0,0,0.08)]" />
                  )}
                </Button>
              ) : null}
              {isOwnDrama ? null : (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    aria-label={t('更多')}
                    className={cn(
                      'inline-flex size-6 items-center justify-center rounded-none',
                      'text-foreground outline-none',
                      'hover:opacity-90',
                    )}
                  >
                    <IconCommentMore className="size-6 drop-shadow-[0_0.667px_2.667px_rgba(0,0,0,0.08)]" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    side="bottom"
                    sideOffset={14}
                    className={cn(
                      // Layout — Figma 1003:136681 短剧更多仅「举报」
                      'flex w-auto min-w-0 flex-col items-stretch gap-0 overflow-hidden p-0',
                      'rounded-2xl border-0 bg-card ring-0',
                      'shadow-[1px_5px_20px_0_rgba(0,0,0,0.13)]',
                    )}
                  >
                    <DropdownMenuItem
                      onClick={handleOpenDramaReport}
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
              )}
            </div>
          </div>

          {completedLabel || heatLabel ? (
            <div className={cn('flex gap-2')}>
              {completedLabel ? (
                <div
                  className={cn(
                    'flex min-w-0 flex-1 flex-col items-center justify-center gap-1',
                    'rounded-xl border border-border px-4 py-3',
                    isFullscreen
                      ? 'bg-page-thirdly'
                      : 'bg-black/25 dark:bg-white/10',
                  )}
                >
                  <strong className="text-base font-bold leading-6 text-foreground">
                    {completedLabel}
                  </strong>
                  <span className="text-xs leading-4 tracking-[0.04px] text-muted-foreground">
                    {t('完播')}
                  </span>
                </div>
              ) : null}
              {heatLabel ? (
                <div
                  className={cn(
                    'flex min-w-0 flex-1 flex-col items-center justify-center gap-1',
                    'rounded-xl border border-border px-4 py-3',
                    isFullscreen
                      ? 'bg-page-thirdly'
                      : 'bg-black/25 dark:bg-white/10',
                  )}
                >
                  <strong className="text-base font-bold leading-6 text-foreground">
                    {heatLabel}
                  </strong>
                  <span className="text-xs leading-4 tracking-[0.04px] text-muted-foreground">
                    {t('热度')}
                  </span>
                </div>
              ) : null}
            </div>
          ) : null}

          {synopsisLabel ? (
            <div className={cn('flex items-start gap-2')}>
              <div className={cn('relative min-w-0 flex-1')}>
                <p
                  className={cn(
                    'min-w-0 w-full text-[15px] leading-[22px] text-muted-foreground',
                    !isSynopsisExpanded && 'line-clamp-2',
                  )}
                >
                  <span className="break-all">{synopsisLabel}</span>
                </p>
                <p
                  ref={synopsisMeasureRef}
                  aria-hidden
                  className={cn(
                    'pointer-events-none invisible absolute inset-x-0 top-0 -z-10',
                    'min-w-0 w-full text-[15px] leading-[22px]',
                  )}
                >
                  <span className="break-all">{synopsisLabel}</span>
                </p>
              </div>
              {canToggleSynopsis || isSynopsisExpanded ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleToggleSynopsis}
                  className={cn(
                    'h-auto shrink-0 p-0',
                    'text-sm font-medium leading-5 text-foreground',
                  )}
                >
                  {isSynopsisExpanded ? t('收起') : t('展开')}
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className={cn('flex flex-col gap-3 px-4')}>
          <div className="h-px w-full bg-border" />
          <div className={cn('flex items-center gap-2')}>
            <p className="shrink-0 text-base font-bold leading-6 text-foreground">
              {t('评分')}
            </p>
            <fieldset
              className={cn(
                'm-0 flex items-center border-0 p-0',
                isFullscreen ? 'gap-2' : 'gap-1',
              )}
            >
              <legend className="sr-only">{t('评分')}</legend>
              {[1, 2, 3, 4, 5].map((star) => {
                const hasRated = myRating !== undefined && myRating > 0;
                const isActive = hasRated && star <= myRating;

                return (
                  <Button
                    key={star}
                    type="button"
                    variant="ghost"
                    disabled={isRatingPending}
                    aria-label={t('{{score}}星', { score: star })}
                    onClick={handleSelectRating(star)}
                    className={cn(
                      'size-6 rounded-none p-0',
                      'hover:bg-transparent',
                    )}
                  >
                    <IconPlayRatingStar
                      // 未评：空心描边；已评：实心（点亮金 / 未点亮灰）
                      filled={hasRated}
                      className={cn(
                        'size-6',
                        isActive
                          ? 'text-play-rating-star'
                          : hasRated
                            ? 'text-muted-foreground'
                            : 'text-muted-foreground/40',
                      )}
                    />
                  </Button>
                );
              })}
            </fieldset>
            <span className="text-sm leading-5 text-foreground">
              {myRating !== undefined && myRating > 0
                ? t('已评分{{score}}', {
                    score: formatPlayAvgRating(myRating),
                  })
                : t('未评')}
            </span>
          </div>
          <div className="h-px w-full bg-border" />
        </div>

        <ul
          ref={episodeListRef}
          className={cn(
            // Layout — Figma 31:7218：分集列表竖排，项间距 12
            'flex min-h-0 flex-1 list-none flex-col gap-3 overflow-y-auto p-4',
          )}
        >
          {episodeRows.map((row) => {
            const episode = row.episodeNo ?? 0;
            if (episode < 1) {
              return null;
            }

            const isSelected = episode === currentEpisode;
            const rowCover =
              ('coverUrl' in row && row.coverUrl?.trim()) || coverImage;
            // 稿面固定「第N集」，不用接口 title（常为剧名/作品名）
            const rowTitle = t('第{{n}}集', { n: episode });
            const rowDesc =
              ('description' in row && row.description?.trim()) || synopsisText;
            const rowEpisodeId =
              'episodeId' in row ? readSnowflakeId(row.episodeId) : undefined;
            const rowLikeCount =
              'likeCount' in row && row.likeCount !== undefined
                ? row.likeCount
                : undefined;
            // 只读数量；优先互动 overlay，保证播放栏点赞后列表即时更新
            const likeCount =
              resolveEpisodeLikeCount?.(rowEpisodeId, rowLikeCount) ??
              rowLikeCount;
            const likeCountLabel =
              likeCount !== undefined ? formatNumber(likeCount, 0) : undefined;

            return (
              <li
                key={episode}
                ref={isSelected ? currentEpisodeItemRef : undefined}
                className={cn(
                  // Layout — Figma 31:7219 播放中整行描边 + gap 12
                  'flex items-center gap-3 rounded-md',
                  isSelected && 'border border-border pr-2',
                )}
              >
                <PlayImmersiveEpisodeCover
                  cover={rowCover}
                  isPlaying={isSelected}
                  onSelect={handleSelectEpisode(episode)}
                />

                <div
                  className={cn(
                    // Layout — Figma 31:7117：第N集 / 简介 / 爱心，间距 5→6
                    'flex min-w-0 flex-1 flex-col items-start justify-center gap-1.5',
                  )}
                >
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleSelectEpisode(episode)}
                    className={cn(
                      'flex h-auto w-full flex-col items-start gap-1.5 rounded-none p-0',
                      'text-left hover:bg-transparent',
                    )}
                  >
                    <span
                      className={cn(
                        // Visual — Figma Typography/3.5 Bold 15/22
                        'text-[15px] font-bold leading-[22px] text-foreground',
                      )}
                    >
                      {rowTitle}
                    </span>
                    {rowDesc ? (
                      <span
                        className={cn(
                          // Visual — Figma Typography/2 Regular 12/16
                          'w-full truncate text-xs leading-4 tracking-[0.04px]',
                          'text-muted-foreground',
                        )}
                      >
                        {rowDesc}
                      </span>
                    ) : null}
                  </Button>

                  <span
                    className={cn(
                      // Layout — Figma 31:7157：空心爱心 + 计数（只读）
                      'inline-flex h-auto items-center justify-center gap-1',
                      // Visual — Figma Typography/2.5 Regular 13/18
                      'text-[13px] leading-[18px] text-muted-foreground',
                    )}
                  >
                    <IconPlayHeartOutline className="size-4" aria-hidden />
                    {likeCountLabel ?? '—'}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
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

type PlayImmersiveEpisodeCoverProps = {
  cover?: string;
  isPlaying: boolean;
  onSelect: () => void;
};

/** Figma 31:7219 / 31:7116 — 分集封面：悬停放大；播放中叠加播放图标 */
function PlayImmersiveEpisodeCover({
  cover,
  isPlaying,
  onSelect,
}: PlayImmersiveEpisodeCoverProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onSelect}
      className={cn(
        'group h-auto shrink-0 rounded-md p-0',
        'hover:bg-transparent',
      )}
    >
      <div className="relative h-20 w-[60px] overflow-hidden rounded-md">
        {cover ? (
          <img
            alt=""
            src={cover}
            className={cn(
              'absolute top-1/2 left-1/2 size-full max-w-none -translate-x-1/2 -translate-y-1/2 object-cover',
              'transition-[width,height] duration-300 ease-out',
              'group-hover:size-[calc(100%+16px)]',
            )}
          />
        ) : (
          <div className="size-full bg-muted" />
        )}
        {isPlaying ? (
          <>
            <span aria-hidden className="absolute inset-0 bg-black/25" />
            <IconPlayerPlay
              aria-hidden
              className={cn(
                'absolute top-1/2 left-1/2 size-6 -translate-x-1/2 -translate-y-1/2 text-white',
                'drop-shadow-[0_1px_8px_rgba(0,0,0,0.08)]',
              )}
            />
          </>
        ) : null}
      </div>
    </Button>
  );
}
