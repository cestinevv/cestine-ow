import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { DramaPlayResponse } from '@/api/__generated__/story/model/dramaPlayResponse';
import IconPlayBookmarkFilled from '@/assets/svg/IconPlayBookmarkFilled';
import IconPlayBookmarkOutline from '@/assets/svg/IconPlayBookmarkOutline';
import IconPlayCommentOutline from '@/assets/svg/IconPlayCommentOutline';
import IconPlayHeartFilled from '@/assets/svg/IconPlayHeartFilled';
import IconPlayHeartOutline from '@/assets/svg/IconPlayHeartOutline';
import IconPlayRatingStar from '@/assets/svg/IconPlayRatingStar';
import IconPlayShareOutline from '@/assets/svg/IconPlayShareOutline';
import { Button } from '@/components/ui/button';
import { usePlayRequireLogin } from '@/features/play/hooks/usePlayRequireLogin';
import {
  getPlayDramaEpisodesQueryKey,
  getPlayMediaDetail,
  getPlayMediaDetailQueryKey,
  togglePlayFavoriteEpisode,
  togglePlayLikeEpisode,
} from '@/features/play/playDramaApi';
import {
  invalidateProfileFavoritesQueries,
  patchRecommendFeedFavorite,
} from '@/features/play/playFavoriteCache';
import {
  formatPlayAvgRating,
  normalizeDramaPlayResponse,
  unwrapOrvalPayload,
} from '@/features/play/playFormat';
import { buildPlayShareText } from '@/features/play/playShare';
import { useProfileBlockInteractionGuard } from '@/features/profile/useProfileBlockInteractionGuard';
import { cn, formatNumber } from '@/utils';

type PlayEngagementBarProps = {
  dramaId: string;
  currentEpisode: number;
  episodeApiId?: string;
  episodePlay?: DramaPlayResponse;
  dramaTitle?: string;
  favoriteCount?: number;
  avgRating?: number;
  totalRatingUserCount?: number;
  creatorUserId?: string;
  onOpenComment?: () => void;
  onOpenRating?: () => void;
  /** 由外层 engagement 接管时传入，避免与侧栏双链路 */
  onToggleLike?: () => void;
  onToggleFavorite?: () => void;
  isLikePending?: boolean;
  isFavoritePending?: boolean;
  layout?: 'default' | 'sidebar';
};

export function PlayEngagementBar({
  dramaId,
  currentEpisode: _currentEpisode,
  episodeApiId,
  episodePlay,
  dramaTitle,
  favoriteCount,
  avgRating,
  totalRatingUserCount,
  creatorUserId,
  onOpenComment,
  onOpenRating,
  onToggleLike,
  onToggleFavorite,
  isLikePending,
  isFavoritePending,
  layout = 'default',
}: PlayEngagementBarProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { isLogin, requireLogin } = usePlayRequireLogin();
  const { guardBlockedInteraction } =
    useProfileBlockInteractionGuard(creatorUserId);

  const likeCount = episodePlay?.likeCount;
  const commentCount = episodePlay?.commentCount;
  const likedByMe = isLogin && (episodePlay?.likedByMe ?? false);
  const favoritedByMe = isLogin && (episodePlay?.favoritedByMe ?? false);
  const ratingLabel = formatPlayAvgRating(avgRating, totalRatingUserCount);
  const usesExternalFavorite = onToggleFavorite !== undefined;
  const usesExternalLike = onToggleLike !== undefined;

  const likeMutation = useMutation({
    mutationFn: ({ episodeId }: { episodeId: string }) =>
      togglePlayLikeEpisode(dramaId, episodeId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: getPlayDramaEpisodesQueryKey(dramaId),
      });
    },
    onError: () => {
      toast.error(t('再试一次'));
    },
  });

  const favoriteMutation = useMutation({
    mutationFn: (episodeId: string) => togglePlayFavoriteEpisode(episodeId),
    onSuccess: async () => {
      if (!episodeApiId) {
        return;
      }

      const desired = !favoritedByMe;
      const optimisticCount =
        favoriteCount === undefined
          ? undefined
          : Math.max(0, favoriteCount + (desired ? 1 : -1));

      try {
        const episodeResponse = await queryClient.fetchQuery({
          queryKey: getPlayMediaDetailQueryKey(episodeApiId),
          queryFn: ({ signal }) =>
            getPlayMediaDetail(episodeApiId, undefined, { signal }),
          staleTime: 0,
        });

        const episodeDetail = normalizeDramaPlayResponse(
          unwrapOrvalPayload<DramaPlayResponse>(episodeResponse) ?? undefined,
        );
        const serverFavorited =
          episodeDetail?.favoritedByMe === undefined
            ? desired
            : Boolean(episodeDetail.favoritedByMe);
        const serverCount =
          (
            episodeDetail as
              | (DramaPlayResponse & { favoriteCount?: number })
              | undefined
          )?.favoriteCount ?? optimisticCount;

        queryClient.setQueryData(
          getPlayMediaDetailQueryKey(episodeApiId),
          () => ({
            ...(episodeDetail ?? {}),
            favoritedByMe: serverFavorited,
            favoriteCount: serverCount,
          }),
        );

        patchRecommendFeedFavorite(queryClient, {
          episodeId: episodeApiId,
          favoritedByMe: serverFavorited,
          favoriteCount: serverCount,
        });
        invalidateProfileFavoritesQueries(queryClient);
      } catch {
        // 校正失败时至少失效分集列表
      }

      void queryClient.invalidateQueries({
        queryKey: getPlayDramaEpisodesQueryKey(dramaId),
      });
    },
    onError: () => {
      toast.error(t('再试一次'));
    },
  });

  const handleToggleLike = () => {
    if (!requireLogin()) {
      return;
    }

    if (!guardBlockedInteraction('like')) {
      return;
    }

    if (usesExternalLike) {
      onToggleLike();
      return;
    }

    if (!episodeApiId) {
      toast.error(t('再试一次'));
      return;
    }

    likeMutation.mutate({ episodeId: episodeApiId });
  };

  const handleToggleFavorite = () => {
    if (!requireLogin()) {
      return;
    }

    if (!guardBlockedInteraction('favorite')) {
      return;
    }

    if (usesExternalFavorite) {
      onToggleFavorite();
      return;
    }

    if (!episodeApiId) {
      toast.error(t('再试一次'));
      return;
    }

    favoriteMutation.mutate(episodeApiId);
  };

  const handleShareClick = async () => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const shareText = buildPlayShareText({
        origin: window.location.origin,
        dramaId,
        episodeId: episodeApiId,
        episodeNo: _currentEpisode,
        dramaTitle,
        description: episodePlay?.description,
        t,
      });
      if (!shareText) {
        toast.error(t('再试一次'));
        return;
      }

      await navigator.clipboard.writeText(shareText);
      toast.success(t('链接已复制'));
    } catch {
      toast.error(t('再试一次'));
    }
  };

  const isSidebar = layout === 'sidebar';

  const engagementButtonClass = cn(
    'flex h-auto shrink-0 items-center gap-1',
    'rounded-[10px] bg-transparent font-normal shadow-none',
    'hover:bg-transparent hover:text-foreground',
    isSidebar
      ? 'justify-center px-3 py-2'
      : cn(
          'gap-2 rounded-[10px] bg-transparent p-0',
          'md:h-9 md:justify-center md:px-3 md:py-2 md:font-medium',
        ),
  );

  const countClass = cn(
    'text-sm font-medium leading-5',
    isSidebar ? 'text-foreground' : 'text-muted-foreground md:hidden',
  );

  const desktopLabelGroupClass = cn(
    'hidden items-center gap-1',
    'text-sm font-medium leading-5 text-muted-foreground md:inline-flex',
    isSidebar && 'md:hidden',
  );

  const showRatingAction = onOpenRating !== undefined;
  const showCommentAction = onOpenComment !== undefined && !showRatingAction;
  const handleOpenRating = () => {
    if (!guardBlockedInteraction('rating')) {
      return;
    }

    onOpenRating?.();
  };
  const handleOpenComment = () => {
    if (!guardBlockedInteraction('comment')) {
      return;
    }

    onOpenComment?.();
  };

  return (
    <section
      aria-label={t('作品互动')}
      className={cn(
        'flex w-full items-center',
        isSidebar
          ? 'justify-between gap-2'
          : 'justify-between md:justify-start md:gap-3',
      )}
    >
      <Button
        type="button"
        variant="ghost"
        disabled={
          usesExternalLike ? Boolean(isLikePending) : likeMutation.isPending
        }
        onClick={handleToggleLike}
        aria-label={t('点赞')}
        className={engagementButtonClass}
      >
        {likedByMe ? (
          <IconPlayHeartFilled
            aria-hidden
            className={cn('size-5 shrink-0 text-destructive')}
          />
        ) : (
          <IconPlayHeartOutline
            aria-hidden
            className={cn('size-5 shrink-0 text-muted-foreground')}
          />
        )}
        {likeCount !== undefined ? (
          <span className={countClass}>{formatNumber(likeCount, 0)}</span>
        ) : null}
        <span className={desktopLabelGroupClass}>
          <span>{t('点赞')}</span>
          {likeCount !== undefined ? (
            <span>({formatNumber(likeCount, 0)})</span>
          ) : null}
        </span>
      </Button>
      <Button
        type="button"
        variant="ghost"
        disabled={
          usesExternalFavorite
            ? Boolean(isFavoritePending)
            : favoriteMutation.isPending
        }
        onClick={handleToggleFavorite}
        aria-label={t('收藏')}
        className={engagementButtonClass}
      >
        {favoritedByMe ? (
          <IconPlayBookmarkFilled
            aria-hidden
            className={cn('size-5 shrink-0 text-watch-bookmark-active')}
          />
        ) : (
          <IconPlayBookmarkOutline
            aria-hidden
            className={cn('size-5 shrink-0 text-muted-foreground')}
          />
        )}
        {favoriteCount !== undefined ? (
          <span className={countClass}>{formatNumber(favoriteCount, 0)}</span>
        ) : null}
        <span className={desktopLabelGroupClass}>
          <span>{t('收藏')}</span>
          {favoriteCount !== undefined ? (
            <span>({formatNumber(favoriteCount, 0)})</span>
          ) : null}
        </span>
      </Button>
      {showRatingAction ? (
        <Button
          type="button"
          variant="ghost"
          onClick={handleOpenRating}
          aria-label={t('点击评分')}
          className={engagementButtonClass}
        >
          <IconPlayRatingStar
            aria-hidden
            filled={!isSidebar}
            className={cn(
              'size-5 shrink-0',
              isSidebar ? 'text-foreground' : 'text-[#ffba18]',
            )}
          />
          {ratingLabel ? (
            <span
              className={cn(
                countClass,
                !isSidebar && 'text-[#ffba18] md:inline',
              )}
            >
              {ratingLabel}
            </span>
          ) : null}
        </Button>
      ) : null}
      {showCommentAction ? (
        <Button
          type="button"
          variant="ghost"
          onClick={handleOpenComment}
          aria-label={t('评论')}
          className={engagementButtonClass}
        >
          <IconPlayCommentOutline
            aria-hidden
            className={cn('size-5 shrink-0 text-muted-foreground')}
          />
          {commentCount !== undefined ? (
            <span className={countClass}>{formatNumber(commentCount, 0)}</span>
          ) : null}
          <span className={desktopLabelGroupClass}>
            <span>{t('评论')}</span>
            {commentCount !== undefined ? (
              <span>({formatNumber(commentCount, 0)})</span>
            ) : null}
          </span>
        </Button>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        onClick={() => {
          void handleShareClick();
        }}
        aria-label={t('分享')}
        className={cn(engagementButtonClass, !isSidebar && 'md:justify-center')}
      >
        <IconPlayShareOutline
          aria-hidden
          className={cn('size-5 shrink-0 text-muted-foreground')}
        />
        <span
          className={cn(desktopLabelGroupClass, !isSidebar && 'md:inline-flex')}
        >
          <span>{t('分享')}</span>
        </span>
      </Button>
    </section>
  );
}
