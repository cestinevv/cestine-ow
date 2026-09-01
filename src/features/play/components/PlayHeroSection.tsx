import { useNavigate, useRouter } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { DramaInfo } from '@/api/__generated__/story/model/dramaInfo';
import IconChevronLeft from '@/assets/svg/IconChevronLeft';
import IconPlay from '@/assets/svg/IconPlay';
import { ContentContainer } from '@/components/common/ContentContainer';
import { Button } from '@/components/ui/button';
import type {
  PlayEpisodeMetricsReportSignals,
  PlayEpisodeMetricsTracker,
} from '@/features/play/playEpisodeMetricsTracker';
import { PLAY_CONTENT_CONTAINER_CLASS } from '@/features/play/playFormat';
import { navigateToPlayWatchPage } from '@/features/play/playWatchNavigation';
import { useMobileViewport } from '@/hooks/useMobileViewport';
import { focusPlaybackToPageTop } from '@/hooks/usePlaybackController';
import { cn } from '@/utils';

import { PlayVideoOverlay } from './PlayVideoOverlay';

type PlayHeroSectionProps = {
  dramaId: string;
  dramaInfo?: DramaInfo;
  mediaUrl?: string;
  fallbackMediaUrl?: string;
  isEpisodeDetailPending: boolean;
  isEpisodeDetailError: boolean;
  isEpisodeTranscodingPending?: boolean;
  onRetryEpisodeDetail?: () => void;
  currentEpisode: number;
  onEpisodeChange: (episode: number) => void;
  episodePlayTrigger?: number;
  totalEpisodes: number;
  sidebar?: ReactNode;
  belowVideo?: ReactNode;
  metricsTracker?: PlayEpisodeMetricsTracker | null;
  onMetricsSignals?: (signals: PlayEpisodeMetricsReportSignals) => void;
};

export function PlayHeroSection({
  dramaId,
  dramaInfo,
  mediaUrl,
  fallbackMediaUrl,
  isEpisodeDetailPending,
  isEpisodeDetailError,
  isEpisodeTranscodingPending = false,
  onRetryEpisodeDetail,
  currentEpisode,
  onEpisodeChange,
  episodePlayTrigger = 0,
  totalEpisodes,
  sidebar,
  belowVideo,
  metricsTracker,
  onMetricsSignals,
}: PlayHeroSectionProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const navigate = useNavigate();
  const isMobileViewport = useMobileViewport();

  const episodeTotal = totalEpisodes > 0 ? totalEpisodes : 1;

  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [lastHandledEpisodePlayTrigger, setLastHandledEpisodePlayTrigger] =
    useState(episodePlayTrigger);

  const posterImage = dramaInfo?.coverImg?.trim();

  useEffect(() => {
    if (!isPlayerOpen) {
      return;
    }
    focusPlaybackToPageTop();
  }, [isPlayerOpen]);

  useEffect(() => {
    if (episodePlayTrigger <= 0) {
      return;
    }
    if (episodePlayTrigger <= lastHandledEpisodePlayTrigger) {
      return;
    }
    setLastHandledEpisodePlayTrigger(episodePlayTrigger);

    if (isMobileViewport) {
      navigateToPlayWatchPage(navigate, dramaId, currentEpisode);
      return;
    }

    setIsPlayerOpen(true);
  }, [
    currentEpisode,
    dramaId,
    episodePlayTrigger,
    isMobileViewport,
    lastHandledEpisodePlayTrigger,
    navigate,
  ]);

  const handleStartPlay = () => {
    if (isMobileViewport) {
      navigateToPlayWatchPage(navigate, dramaId, currentEpisode);
      return;
    }

    setIsPlayerOpen(true);
  };

  const handleBack = () => {
    router.history.back();
  };

  const isFetchingUrl =
    isPlayerOpen &&
    (isEpisodeDetailPending || (!mediaUrl && !isEpisodeDetailError));

  const showTranscodingOverlay =
    isPlayerOpen && isEpisodeTranscodingPending && !mediaUrl;

  return (
    <section
      className={cn('w-full', 'pt-0 lg:pt-6', 'bg-points-page-surface-muted')}
    >
      <ContentContainer
        className={cn(
          PLAY_CONTENT_CONTAINER_CLASS,
          'flex flex-col',
          'gap-2.5',
          sidebar
            ? 'lg:grid lg:grid-cols-[minmax(0,1fr)_379px] lg:items-start lg:gap-2.5'
            : undefined,
        )}
      >
        <div className={cn('flex min-w-0 flex-col gap-8')}>
          <div
            className={cn(
              'relative shrink-0 overflow-hidden bg-card',
              'max-lg:aspect-video max-lg:h-auto',
              'lg:aspect-[1355/815] lg:h-auto',
              '-mx-5 w-[calc(100%+2.5rem)] max-w-none',
              'md:mx-0 md:w-full md:max-w-none',
              'lg:min-w-0 lg:justify-self-stretch',
            )}
          >
            {!isPlayerOpen ? (
              posterImage ? (
                <img
                  alt=""
                  className={cn('absolute inset-0 size-full object-cover')}
                  decoding="async"
                  height={1052}
                  src={posterImage}
                  width={1750}
                />
              ) : (
                <div className={cn('absolute inset-0 size-full bg-muted')} />
              )
            ) : null}
            {isPlayerOpen ? null : (
              <div
                className={cn(
                  'absolute inset-0',
                  'bg-linear-to-b from-black/10 via-transparent to-black/70',
                )}
              />
            )}
            {isMobileViewport && !isPlayerOpen ? (
              <button
                type="button"
                aria-label={t('立即播放')}
                className={cn(
                  'absolute inset-0 z-5 cursor-pointer border-0 bg-transparent p-0',
                )}
                onClick={handleStartPlay}
              />
            ) : null}
            {!isPlayerOpen ? (
              <div
                className={cn(
                  'absolute inset-x-0 top-0 z-20',
                  'flex items-center gap-2.5 p-3',
                )}
              >
                <Button
                  type="button"
                  variant="ghost"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleBack();
                  }}
                  className={cn(
                    'relative z-20 size-10 rounded-full p-0',
                    'text-white hover:bg-white/10 hover:text-white',
                  )}
                >
                  <IconChevronLeft aria-hidden className="size-6" />
                  <span className="sr-only">{t('返回')}</span>
                </Button>
                <p
                  className={cn(
                    'flex min-w-0 flex-1 items-center text-sm font-medium leading-5 text-white',
                    'lg:text-sm lg:leading-5',
                  )}
                  title={`${dramaInfo?.title ?? String(dramaId)}（${t('第 {{n}} 集', { n: currentEpisode })}）`}
                >
                  <span className="min-w-0 truncate">
                    {dramaInfo?.title ?? String(dramaId)}
                  </span>
                  <span className="shrink-0 whitespace-nowrap">
                    （{t('第 {{n}} 集', { n: currentEpisode })}）
                  </span>
                </p>
              </div>
            ) : null}
            {!isPlayerOpen ? (
              <div
                className={cn(
                  'pointer-events-none absolute inset-0 z-10',
                  'flex items-center justify-center',
                )}
              >
                <Button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleStartPlay();
                  }}
                  className={cn(
                    'pointer-events-auto relative z-20',
                    'size-12 rounded-full border border-white/60 md:size-[85px]',
                    'bg-white/45 p-0 shadow-none backdrop-blur-md',
                    'hover:bg-white/55',
                  )}
                >
                  <IconPlay
                    aria-hidden
                    className="ml-0.5 size-5 text-white md:size-9"
                  />
                  <span className="sr-only">{t('立即播放')}</span>
                </Button>
              </div>
            ) : null}
            <PlayVideoOverlay
              isPlayerOpen={isPlayerOpen}
              onPlayerOpenChange={setIsPlayerOpen}
              mediaUrl={mediaUrl}
              fallbackMediaUrl={fallbackMediaUrl}
              isFetchingUrl={isFetchingUrl}
              isEpisodeDetailError={isEpisodeDetailError}
              isEpisodeTranscodingPending={showTranscodingOverlay}
              coverImage={posterImage}
              onRetryEpisodeDetail={onRetryEpisodeDetail}
              dramaTitle={dramaInfo?.title?.trim()}
              currentEpisode={currentEpisode}
              episodeTotal={episodeTotal}
              onEpisodeChange={onEpisodeChange}
              metricsTracker={metricsTracker}
              onMetricsSignals={onMetricsSignals}
              layout="embedded"
            />
          </div>
          {belowVideo}
        </div>
        {sidebar}
      </ContentContainer>
    </section>
  );
}
