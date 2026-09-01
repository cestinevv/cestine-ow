import { useNavigate } from '@tanstack/react-router';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { DramaPlayResponse } from '@/api/__generated__/story/model/dramaPlayResponse';
import AppLoadingContainer from '@/components/common/AppLoadingContainer';
import { ContentContainer } from '@/components/common/ContentContainer';
import { PlayCommentsSection } from '@/features/play/components/PlayCommentsSection';
import { PlayDetailCharactersSection } from '@/features/play/components/PlayDetailCharactersSection';
import { PlayDetailDramaMeta } from '@/features/play/components/PlayDetailDramaMeta';
import { PlayDetailSidebar } from '@/features/play/components/PlayDetailSidebar';
import { PlayEngagementBar } from '@/features/play/components/PlayEngagementBar';
import { PlayEpisodesSidebar } from '@/features/play/components/PlayEpisodesSidebar';
import { PlayHeroSection } from '@/features/play/components/PlayHeroSection';
import { PlayRatingDialog } from '@/features/play/components/PlayRatingDialog';
import { usePlayEpisodeMedia } from '@/features/play/hooks/usePlayEpisodeMedia';
import { usePlayEpisodeMetricsBridge } from '@/features/play/hooks/usePlayEpisodeMetricsBridge';
import { usePlayWatchHistoryReporter } from '@/features/play/hooks/usePlayWatchHistoryReporter';
import {
  getPlayDramaInfoCreatorUserId,
  PLAY_CONTENT_CONTAINER_CLASS,
  resolvePlayDetailRoles,
} from '@/features/play/playFormat';
import { navigateToPlayWatchPage } from '@/features/play/playWatchNavigation';
import { useAppLogin } from '@/hooks/useAppLogin';
import { useMobileViewport } from '@/hooks/useMobileViewport';
import useGlobalStore from '@/stores/global';
import { cn } from '@/utils';

type PlayDetailViewProps = {
  dramaId: string;
  autoplayOnMount?: boolean;
};

export function PlayDetailView({
  dramaId,
  autoplayOnMount = false,
}: PlayDetailViewProps) {
  const navigate = useNavigate();
  const isMobileViewport = useMobileViewport();
  const isLogin = useGlobalStore((s) => s.isLogin);
  const { login } = useAppLogin();
  const [episodePlayTrigger, setEpisodePlayTrigger] = useState(0);
  const [isRatingDialogOpen, setIsRatingDialogOpen] = useState(false);
  const [currentEpisode, setCurrentEpisode] = useState(1);

  const {
    dramaIdText,
    dramaDetail,
    isDramaPending: isPending,
    isDramaError: isError,
    episodePlay,
    episodeApiId,
    isEpisodeDetailEnabled,
    isEpisodeDetailError,
    isEpisodeTranscodingPending,
    isEpisodePlaybackDetailPending,
    isEpisodeListPending,
    playbackUrl: heroPlaybackUrl,
    fallbackMp4Url,
    refetchEpisodeDetail,
    reportEpisodePlay,
    reportEpisodeComplete,
    episodeTotal: mediaEpisodeTotal,
  } = usePlayEpisodeMedia({ dramaId, currentEpisode });

  const metricsResetKey = `${currentEpisode}:${heroPlaybackUrl ?? ''}`;
  const { tracker, handleMetricsSignals } = usePlayEpisodeMetricsBridge({
    isLogin,
    episodeApiId,
    reportEpisodePlay,
    reportEpisodeComplete,
    resetKey: metricsResetKey,
  });
  usePlayWatchHistoryReporter({ episodeId: episodeApiId, isLogin });

  const {
    dramaInfo,
    playbackRule,
    totalEpisodes: detailTotalEpisodes,
  } = dramaDetail ?? {};
  const roles = resolvePlayDetailRoles(dramaDetail);
  const creatorUserId = getPlayDramaInfoCreatorUserId(dramaInfo);

  const totalEpisodes =
    mediaEpisodeTotal !== undefined && mediaEpisodeTotal > 0
      ? mediaEpisodeTotal
      : (detailTotalEpisodes ?? playbackRule?.totalEpisodes ?? 1);

  const autoplayHandledRef = useRef(false);

  const shouldRedirectToPlayList =
    dramaIdText === undefined ||
    isError ||
    (!isPending && !isError && !dramaInfo);

  useEffect(() => {
    if (!shouldRedirectToPlayList) {
      return;
    }

    void navigate({ to: '/', replace: true });
  }, [navigate, shouldRedirectToPlayList]);

  useLayoutEffect(() => {
    if (dramaIdText === undefined) {
      return;
    }

    setCurrentEpisode(1);
    setEpisodePlayTrigger(0);
    autoplayHandledRef.current = false;
  }, [dramaIdText]);

  useEffect(() => {
    if (
      !autoplayOnMount ||
      isMobileViewport ||
      autoplayHandledRef.current ||
      isPending ||
      !dramaInfo
    ) {
      return;
    }

    autoplayHandledRef.current = true;
    setCurrentEpisode(1);
    setEpisodePlayTrigger((prev) => prev + 1);
  }, [autoplayOnMount, isMobileViewport, isPending, dramaInfo]);

  const isEpisodeDetailBlockingPlayer =
    isEpisodeDetailEnabled &&
    !heroPlaybackUrl &&
    !isEpisodeDetailError &&
    !isEpisodeTranscodingPending &&
    (isEpisodePlaybackDetailPending || isEpisodeListPending);

  const handleEpisodeChange = (episode: number) => {
    setCurrentEpisode(episode);
  };

  const handleSelectEpisode = (episode: number) => {
    if (isMobileViewport) {
      navigateToPlayWatchPage(navigate, dramaId, episode);
      return;
    }

    setCurrentEpisode(episode);
    setEpisodePlayTrigger((prev) => prev + 1);
  };

  const handleOpenRating = () => {
    if (!isLogin) {
      login();
      return;
    }

    setIsRatingDialogOpen(true);
  };

  if (shouldRedirectToPlayList) {
    return null;
  }

  const desktopSidebar = (
    <PlayDetailSidebar
      className="max-lg:hidden"
      dramaId={dramaId}
      dramaInfo={dramaInfo}
      totalEpisodes={totalEpisodes}
      currentEpisode={currentEpisode}
      episodeApiId={episodeApiId}
      episodePlay={episodePlay}
      creatorUserId={creatorUserId}
      onOpenRating={handleOpenRating}
      onSelectEpisode={handleSelectEpisode}
    />
  );

  const desktopBelowVideo = (
    <div
      className={cn('hidden flex-col gap-8 pr-0', 'lg:flex lg:pb-8 lg:pr-8')}
    >
      <PlayDetailCharactersSection roles={roles} />
      {episodeApiId ? (
        <PlayCommentsSection
          dramaId={dramaId}
          currentEpisode={currentEpisode}
          episodeApiId={episodeApiId}
          commentCount={episodePlay?.commentCount}
          creatorUserId={creatorUserId}
        />
      ) : null}
    </div>
  );

  return (
    <article
      className={cn(
        'flex min-h-0 w-full min-w-0 flex-1 flex-col',
        'bg-points-page-surface-muted',
      )}
    >
      <AppLoadingContainer
        data={dramaDetail ? [dramaDetail] : []}
        isLoading={isPending}
        minHeight="calc(100dvh - 60px)"
      >
        <PlayHeroSection
          key={dramaId}
          dramaId={dramaId}
          dramaInfo={dramaInfo}
          mediaUrl={heroPlaybackUrl}
          fallbackMediaUrl={fallbackMp4Url}
          isEpisodeDetailPending={isEpisodeDetailBlockingPlayer}
          isEpisodeDetailError={isEpisodeDetailError}
          isEpisodeTranscodingPending={isEpisodeTranscodingPending}
          onRetryEpisodeDetail={refetchEpisodeDetail}
          currentEpisode={currentEpisode}
          onEpisodeChange={handleEpisodeChange}
          episodePlayTrigger={episodePlayTrigger}
          totalEpisodes={totalEpisodes}
          sidebar={desktopSidebar}
          belowVideo={desktopBelowVideo}
          metricsTracker={tracker}
          onMetricsSignals={handleMetricsSignals}
        />
        <section
          className={cn(
            'flex w-full flex-col',
            'gap-6 pb-24 pt-6',
            'lg:hidden',
            'bg-points-page-surface-muted',
          )}
        >
          <ContentContainer
            className={cn(PLAY_CONTENT_CONTAINER_CLASS, 'flex flex-col gap-6')}
          >
            <PlayDetailCharactersSection roles={roles} />
            <div className={cn('flex flex-col gap-2.5 rounded-xl bg-card p-4')}>
              <PlayDetailDramaMeta
                dramaInfo={dramaInfo}
                totalEpisodes={totalEpisodes}
              />
              <PlayEngagementBar
                dramaId={dramaId}
                currentEpisode={currentEpisode}
                episodeApiId={episodeApiId}
                episodePlay={episodePlay}
                dramaTitle={dramaInfo?.title}
                favoriteCount={
                  (
                    episodePlay as
                      | (DramaPlayResponse & { favoriteCount?: number })
                      | undefined
                  )?.favoriteCount
                }
                avgRating={dramaInfo?.avgRating}
                totalRatingUserCount={dramaInfo?.totalRatingUserCount}
                creatorUserId={creatorUserId}
                onOpenRating={handleOpenRating}
                layout="sidebar"
              />
              <PlayEpisodesSidebar
                totalEpisodes={totalEpisodes}
                selectedEpisode={currentEpisode}
                onSelectEpisode={handleSelectEpisode}
                hideHeader
              />
            </div>
            {episodeApiId ? (
              <PlayCommentsSection
                dramaId={dramaId}
                currentEpisode={currentEpisode}
                episodeApiId={episodeApiId}
                commentCount={episodePlay?.commentCount}
                creatorUserId={creatorUserId}
              />
            ) : null}
          </ContentContainer>
        </section>
      </AppLoadingContainer>
      <PlayRatingDialog
        open={isRatingDialogOpen}
        dramaId={dramaId}
        creatorUserId={creatorUserId}
        onOpenChange={setIsRatingDialogOpen}
      />
    </article>
  );
}
