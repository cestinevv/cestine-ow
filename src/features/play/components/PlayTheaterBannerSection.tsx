import { Link } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import IconChevronLeft from '@/assets/svg/IconChevronLeft';
import IconPlayerVolume2 from '@/assets/svg/IconPlayerVolume2';
import IconPlayerVolumeOff from '@/assets/svg/IconPlayerVolumeOff';
import { ActorDetailRouteLink } from '@/components/common/ActorDetailRouteLink';
import { Button } from '@/components/ui/button';
import { ContentBadge } from '@/features/badge/ContentBadge';
import { PlayBoundActorAvatar } from '@/features/play/components/PlayBoundActorAvatar';
import type { PlayTheaterBannerPlaybackEntry } from '@/features/play/components/PlayTheaterBannerMedia';
import { PlayTheaterBannerMedia } from '@/features/play/components/PlayTheaterBannerMedia';
import { PlayTheaterBannerStats } from '@/features/play/components/PlayTheaterBannerStats';
import type { PlayDramaActorInfo } from '@/features/play/playFormat';
import {
  formatPlayStoryPerHour,
  getPlayDramaActors,
} from '@/features/play/playFormat';
import type { PlayTheaterBannerItem } from '@/features/play/types/playTheaterBannerItem';
import { useMobileViewport } from '@/hooks/useMobileViewport';
import { cn, SHOW_DEV_ONLY_UI } from '@/utils';

const BANNER_CROSSFADE_MS = 700;

type PlayTheaterBannerSectionProps = {
  featuredItems: PlayTheaterBannerItem[];
  playbackEntries: PlayTheaterBannerPlaybackEntry[];
  activeIndex: number;
  bannerMuted: boolean;
  onActiveIndexChange: (index: number) => void;
  onToggleMute: () => void;
  onBeforePlay?: (item: PlayTheaterBannerItem) => void;
};

export function PlayTheaterBannerSection({
  featuredItems,
  playbackEntries,
  activeIndex,
  bannerMuted,
  onActiveIndexChange,
  onToggleMute,
  onBeforePlay,
}: PlayTheaterBannerSectionProps) {
  const { t } = useTranslation();
  const isMobileViewport = useMobileViewport();
  const [contentVisible, setContentVisible] = useState(true);
  const prevIndexRef = useRef(activeIndex);

  const activeItem = featuredItems[activeIndex] ?? featuredItems[0];
  const title = activeItem?.title ?? '';
  const actors = getPlayDramaActors({
    actorCollections: activeItem?.actorCollections,
  });
  const playLinkTo = isMobileViewport
    ? ('/play/$dramaId/watch' as const)
    : ('/play/$dramaId' as const);

  useEffect(() => {
    if (prevIndexRef.current === activeIndex) {
      return;
    }

    setContentVisible(false);
    const timer = window.setTimeout(() => {
      setContentVisible(true);
      prevIndexRef.current = activeIndex;
    }, BANNER_CROSSFADE_MS / 2);

    return () => window.clearTimeout(timer);
  }, [activeIndex]);

  const handlePreviousClick = () => {
    const nextIndex =
      activeIndex <= 0 ? featuredItems.length - 1 : activeIndex - 1;
    onActiveIndexChange(nextIndex);
  };

  const handleNextClick = () => {
    const nextIndex =
      activeIndex >= featuredItems.length - 1 ? 0 : activeIndex + 1;
    onActiveIndexChange(nextIndex);
  };

  const handleDotClick = (index: number) => {
    onActiveIndexChange(index);
  };

  return (
    <section
      aria-label={t('剧场')}
      className={cn(
        // 移动端 Banner 顶满；桌面保留版心内上间距
        'pt-0 md:pt-4',
        'bg-points-page-surface-muted text-white',
      )}
    >
      <div
        className={cn(
          // H5 Figma 48:47891：390×520 → 3:4 全宽无圆角；桌面仍 16:8
          'relative mx-auto w-full overflow-hidden bg-black',
          // 冲出版心水平 padding（px-5），贴齐视口左右
          '-mx-5 w-[calc(100%+2.5rem)] rounded-none aspect-[3/4]',
          'md:mx-0 md:aspect-[16/8] md:w-full md:max-h-[960px] md:rounded-[10px]',
          'min-[1280px]:rounded-xl',
        )}
      >
        <PlayTheaterBannerMedia
          featuredItems={featuredItems}
          playbackEntries={playbackEntries}
          activeIndex={activeIndex}
          muted={bannerMuted}
        />

        <div
          className="pointer-events-none absolute inset-0 bg-black/18"
          aria-hidden
        />
        <div
          className={cn(
            // H5 仅底部渐变（稿面 h≈266 / 520）；桌面保留更长蒙层
            'pointer-events-none absolute inset-x-0 bottom-0',
            'h-[51%] bg-linear-to-b from-transparent to-black/50',
            'md:h-[48%] md:to-black/60',
          )}
          aria-hidden
        />
        <div
          className={cn(
            'pointer-events-none absolute inset-y-0 left-0 w-[68%]',
            'hidden bg-linear-to-r from-black/54 via-black/18 to-transparent md:block',
          )}
          aria-hidden
        />

        {activeItem ? (
          <Link
            to={playLinkTo}
            params={{ dramaId: activeItem.dramaId }}
            onClick={() => onBeforePlay?.(activeItem)}
            className="absolute inset-0 z-10 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
          >
            <span className="sr-only">{title}</span>
          </Link>
        ) : null}

        {featuredItems.length > 1 ? (
          <div
            className={cn(
              // Layout — 左右切换垂直居中；Figma inset 16 / 桌面 32
              'pointer-events-none absolute inset-y-0 z-20 hidden w-full items-center justify-between px-4',
              'md:flex min-[1280px]:px-8',
            )}
          >
            <BannerRoundButton
              label={t('上一部短剧')}
              onClick={handlePreviousClick}
            >
              <IconChevronLeft className="size-6" />
            </BannerRoundButton>
            <BannerRoundButton
              label={t('下一部短剧')}
              onClick={handleNextClick}
            >
              <IconChevronLeft className="size-6 rotate-180" />
            </BannerRoundButton>
          </div>
        ) : null}

        <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-end">
          <div className="pointer-events-none w-full">
            <div
              className={cn(
                // Spacing — H5 稿 px-16 gap-8；桌面 p-32 / gap-12
                'pointer-events-none flex w-full flex-col gap-2 p-4 transition-opacity ease-in-out',
                'min-[1280px]:gap-3 min-[1280px]:p-8',
              )}
              style={{
                opacity: contentVisible ? 1 : 0,
                transitionDuration: `${BANNER_CROSSFADE_MS / 2}ms`,
              }}
            >
              {SHOW_DEV_ONLY_UI && actors.length > 0 ? (
                <div className="pointer-events-none relative flex w-full items-end">
                  <div
                    className={cn(
                      'pointer-events-none flex w-fit max-w-full min-w-0 shrink-0 flex-col gap-2',
                      'min-h-[115px] md:gap-4',
                      'min-[1280px]:min-h-[134px]',
                    )}
                  >
                    <BannerActorGlassPanel actors={actors} />
                  </div>
                </div>
              ) : null}

              <div className="pointer-events-none flex max-w-[640px] flex-col gap-1.5 md:gap-2">
                <ContentBadge badge={activeItem?.badge} variant="drama" />
                {title ? (
                  <h1
                    className={cn(
                      'max-w-full font-bold text-white [overflow-wrap:anywhere]',
                      'text-2xl leading-normal tracking-[-0.12px]',
                      'min-[1280px]:text-[40px]',
                    )}
                  >
                    {title}
                  </h1>
                ) : null}
              </div>

              <div className="pointer-events-none relative flex w-full items-center">
                {activeItem ? (
                  <div className="pointer-events-none min-w-0 flex-1">
                    <PlayTheaterBannerStats
                      creatorName={activeItem?.creatorName}
                      totalPlayCount={activeItem?.totalPlayCount}
                      totalHeatValue={activeItem?.totalHeatValue}
                      avgRating={activeItem?.avgRating}
                      totalRatingUserCount={activeItem?.totalRatingUserCount}
                      showPlaceholders
                    />
                  </div>
                ) : (
                  <div className="min-w-0 flex-1" aria-hidden />
                )}

                {featuredItems.length > 1 ? (
                  <div className="pointer-events-none absolute inset-x-0 hidden items-center justify-center md:flex">
                    <BannerDots
                      activeIndex={activeIndex}
                      count={featuredItems.length}
                      onDotClick={handleDotClick}
                    />
                  </div>
                ) : null}

                <div className="pointer-events-none relative z-10 hidden shrink-0 items-center justify-end md:flex">
                  <BannerMuteButton
                    muted={bannerMuted}
                    label={bannerMuted ? t('取消静音') : t('静音')}
                    onClick={onToggleMute}
                  />
                </div>
              </div>

              {featuredItems.length > 1 ? (
                <div className="pointer-events-none flex items-center justify-between md:hidden">
                  <div className="flex min-w-0 flex-1 justify-center">
                    <BannerDots
                      activeIndex={activeIndex}
                      count={featuredItems.length}
                      onDotClick={handleDotClick}
                    />
                  </div>
                  <BannerMuteButton
                    muted={bannerMuted}
                    label={bannerMuted ? t('取消静音') : t('静音')}
                    onClick={onToggleMute}
                  />
                </div>
              ) : (
                <div className="pointer-events-none flex justify-end md:hidden">
                  <BannerMuteButton
                    muted={bannerMuted}
                    label={bannerMuted ? t('取消静音') : t('静音')}
                    onClick={onToggleMute}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function BannerRoundButton({
  label,
  children,
  onClick,
}: {
  label: string;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={label}
      onClick={onClick}
      className={cn(
        // Visual — Figma 14:6184：p-10 / blur 10 / black-alpha 15 / white border 15
        'pointer-events-auto size-11 rounded-full border border-white/15 bg-black/15 text-white',
        'shadow-[0px_0px_32px_rgba(0,0,0,0.2)] backdrop-blur-[10px]',
        'hover:bg-white/15 hover:text-white',
      )}
    >
      {children}
    </Button>
  );
}

function BannerMuteButton({
  muted,
  label,
  onClick,
}: {
  muted: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={label}
      onClick={onClick}
      className="pointer-events-auto size-6 rounded-none p-0 text-white hover:bg-transparent hover:text-white"
    >
      {muted ? (
        <IconPlayerVolumeOff className="size-6" />
      ) : (
        <IconPlayerVolume2 className="size-6" />
      )}
    </Button>
  );
}

function BannerDots({
  activeIndex,
  count,
  onDotClick,
}: {
  activeIndex: number;
  count: number;
  onDotClick: (index: number) => void;
}) {
  if (count <= 1) {
    return null;
  }

  return (
    <div className="flex items-center justify-center gap-2 rounded-full px-3 py-2">
      {Array.from({ length: count }, (_, index) => `banner-dot-${index}`).map(
        (dotKey, index) => (
          <button
            key={dotKey}
            type="button"
            aria-label={`Slide ${index + 1}`}
            aria-current={index === activeIndex ? 'true' : undefined}
            onClick={() => onDotClick(index)}
            className={cn(
              'pointer-events-auto size-2 rounded-full bg-white transition-opacity',
              index === activeIndex ? 'opacity-100' : 'opacity-30',
            )}
          />
        ),
      )}
    </div>
  );
}

function BannerActorGlassPanel({ actors }: { actors: PlayDramaActorInfo[] }) {
  return (
    <ul
      className={cn(
        // 宽度随演员列收缩（Figma 48:48047 w-fit），勿拉满父级
        'pointer-events-none inline-flex w-fit max-w-full list-none gap-2 overflow-x-auto rounded-2xl p-3',
        // Visual — Figma 40:41706：bg black/30 + blur 6 + 0.5px 描边
        'border-[0.5px] border-white/10 bg-theater-ip-glass-surface backdrop-blur-[6px]',
        'min-[1280px]:gap-3 min-[1280px]:p-3',
        '[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
      )}
    >
      {actors.map((actor, index) => (
        <li
          key={actor.id ?? actor.avatar ?? actor.name ?? index}
          className="w-13 shrink-0 min-[1280px]:w-16"
        >
          <BannerActorCard actor={actor} />
        </li>
      ))}
    </ul>
  );
}

function BannerActorCard({ actor }: { actor: PlayDramaActorInfo }) {
  const name = actor.name?.trim();

  const content = (
    <span
      className={cn(
        // 与玻璃面板 max 高对齐：缺姓名/算力时也不塌高度
        'flex min-h-[91px] flex-col items-center gap-0.5 text-center',
        'min-[1280px]:min-h-[110px]',
      )}
    >
      <PlayBoundActorAvatar
        avatar={actor.avatar}
        name={name}
        className="size-10 min-[1280px]:size-12"
      />
      {name ? (
        <span className="line-clamp-1 max-w-full text-xs leading-4 text-white/60 md:text-[11.2px] min-[1280px]:text-sm min-[1280px]:leading-5">
          {name}
        </span>
      ) : null}
      {actor.computingPower !== undefined ? (
        <span className="text-xs leading-4 font-bold text-white md:text-[11.2px] min-[1280px]:text-sm min-[1280px]:leading-5">
          {formatPlayStoryPerHour(actor.computingPower)}
        </span>
      ) : null}
      <span className="text-xs leading-4 tracking-[0.04px] text-white/60 md:text-[9.6px] md:leading-[12.8px] md:tracking-[0.032px] min-[1280px]:text-xs min-[1280px]:leading-4 min-[1280px]:tracking-[0.04px]">
        STORY/h
      </span>
    </span>
  );

  if (!actor.id) {
    return content;
  }

  return (
    <ActorDetailRouteLink
      actorId={actor.id}
      title={name}
      className="pointer-events-auto block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {content}
    </ActorDetailRouteLink>
  );
}
