import { useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { DramaInfo } from '@/api/__generated__/story/model/dramaInfo';
import IconBrandTinder from '@/assets/svg/IconBrandTinder';
import IconBrandYoutube from '@/assets/svg/IconBrandYoutube';
import { Button } from '@/components/ui/button';
import { ContentBadge } from '@/features/badge/ContentBadge';
import {
  formatPlayHeatValue,
  getPlayDramaNftLabel,
} from '@/features/play/playFormat';
import { cn, formatNumber } from '@/utils';

/** 简介折叠区两行高度（Figma 4938:26697，15px/22px × 2） */
const PLAY_DRAMA_SYNOPSIS_COLLAPSED_HEIGHT_PX = 44;

type PlayDetailDramaMetaProps = {
  dramaInfo?: DramaInfo;
  totalEpisodes?: number;
  className?: string;
};

export function PlayDetailDramaMeta({
  dramaInfo,
  totalEpisodes,
  className,
}: PlayDetailDramaMetaProps) {
  const { t } = useTranslation();
  const synopsisMeasureRef = useRef<HTMLParagraphElement>(null);
  const isSynopsisExpandedRef = useRef(false);
  const [isSynopsisExpanded, setIsSynopsisExpanded] = useState(false);
  const [canToggleSynopsis, setCanToggleSynopsis] = useState(false);

  const title = dramaInfo?.title?.trim() ?? '';
  const synopsisText = dramaInfo?.desc?.trim() ?? '';
  const synopsisLabel = synopsisText
    ? t('简介：{{synopsis}}', { synopsis: synopsisText })
    : '';
  const tags = dramaInfo?.tags ?? [];
  const dramaNftLabel = getPlayDramaNftLabel(dramaInfo);
  const completedLabel =
    dramaInfo?.totalCompletedViewCount !== undefined
      ? formatNumber(dramaInfo.totalCompletedViewCount, 0)
      : undefined;
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

  return (
    <div className={cn('flex min-w-0 flex-col gap-4', className)}>
      <div className={cn('flex flex-col gap-3')}>
        <ContentBadge badge={dramaInfo?.badge} variant="drama" />
        <div className={cn('flex flex-wrap items-center gap-2')}>
          {title ? (
            <h1
              className={cn(
                'text-base font-bold leading-6 tracking-[-0.04px] text-foreground',
                'lg:text-lg lg:leading-[26px]',
              )}
            >
              {title}
            </h1>
          ) : null}
          {dramaNftLabel ? (
            <span
              className={cn(
                'inline-flex shrink-0 items-center justify-center rounded bg-muted',
                'px-2 py-1',
                'text-xs leading-4 tracking-[0.04px] text-foreground',
              )}
            >
              {dramaNftLabel}
            </span>
          ) : null}
        </div>
        {tags.length > 0 ||
        (totalEpisodes !== undefined && totalEpisodes > 0) ? (
          <ul className={cn('flex list-none flex-wrap gap-1.5 p-0')}>
            {tags.map((tag) => (
              <li key={tag}>
                <span
                  className={cn(
                    'inline-flex rounded px-2 py-1',
                    'bg-muted text-xs leading-4 tracking-[0.04px] text-foreground',
                  )}
                >
                  {tag}
                </span>
              </li>
            ))}
            {totalEpisodes !== undefined && totalEpisodes > 0 ? (
              <li>
                <span
                  className={cn(
                    'inline-flex rounded px-2 py-1',
                    'bg-muted text-xs leading-4 tracking-[0.04px] text-foreground',
                  )}
                >
                  {t('全{{count}}集', { count: totalEpisodes })}
                </span>
              </li>
            ) : null}
          </ul>
        ) : null}
        {completedLabel || heatLabel ? (
          <div className={cn('flex w-full gap-2')}>
            {completedLabel ? (
              <div
                className={cn(
                  'flex min-w-0 flex-1 items-center justify-center',
                  'rounded-xl border border-play-drama-stat-border bg-play-drama-stat-surface',
                  'px-4 py-3',
                )}
              >
                <div
                  className={cn(
                    'flex items-center gap-1 text-play-drama-stat-foreground',
                  )}
                >
                  <IconBrandYoutube aria-hidden className="size-6 shrink-0" />
                  <div className={cn('flex items-baseline gap-1')}>
                    <strong
                      className={cn('text-[17px] font-bold leading-[25px]')}
                    >
                      {completedLabel}
                    </strong>
                    <span
                      className={cn(
                        'text-xs font-medium leading-4 tracking-[0.04px]',
                      )}
                    >
                      {t('完播')}
                    </span>
                  </div>
                </div>
              </div>
            ) : null}
            {heatLabel ? (
              <div
                className={cn(
                  'flex min-w-0 flex-1 items-center justify-center',
                  'rounded-xl border border-play-drama-stat-border bg-play-drama-stat-surface',
                  'px-4 py-3',
                )}
              >
                <div
                  className={cn(
                    'flex items-center gap-1 text-play-drama-stat-foreground',
                  )}
                >
                  <IconBrandTinder aria-hidden className="size-6 shrink-0" />
                  <div className={cn('flex items-baseline gap-1')}>
                    <strong
                      className={cn('text-[17px] font-bold leading-[25px]')}
                    >
                      {heatLabel}
                    </strong>
                    <span
                      className={cn(
                        'text-xs font-medium leading-4 tracking-[0.04px]',
                      )}
                    >
                      {t('热度')}
                    </span>
                  </div>
                </div>
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
                onClick={() => setIsSynopsisExpanded((value) => !value)}
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
    </div>
  );
}
