import { useLayoutEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import {
  PLAY_EPISODE_GRID_COLS,
  PLAY_EPISODE_GRID_MAX_ROWS,
  PLAY_EPISODE_GRID_SCROLL_MAX_HEIGHT_PX,
} from '@/features/play/constants/playEpisodeGrid';
import { cn } from '@/utils';

type PlayEpisodeGridProps = {
  totalEpisodes: number;
  selectedEpisode: number;
  onSelectEpisode: (episode: number) => void;
  className?: string;
  /** 是否限制最大 8 行并内部滚动 */
  scrollable?: boolean;
  /** 面板可见时为 true；Sheet 打开后再滚到当前集 */
  isActive?: boolean;
};

export function PlayEpisodeGrid({
  totalEpisodes,
  selectedEpisode,
  onSelectEpisode,
  className,
  scrollable = true,
  isActive = true,
}: PlayEpisodeGridProps) {
  const { t } = useTranslation();
  const listRef = useRef<HTMLDivElement>(null);
  const selectedRowRef = useRef<HTMLFieldSetElement>(null);

  // 当前集所在行滚到可视区顶部，避免打开面板仍停在第 1 集附近
  useLayoutEffect(() => {
    if (!isActive || selectedEpisode < 1 || totalEpisodes <= 0) {
      return;
    }

    const scrollSelectedRowToTop = () => {
      const list = listRef.current;
      const row = selectedRowRef.current;

      if (!list || !row || list.clientHeight <= 0) {
        return false;
      }

      list.scrollTop +=
        row.getBoundingClientRect().top - list.getBoundingClientRect().top;

      return true;
    };

    if (scrollSelectedRowToTop()) {
      return;
    }

    const rafId = window.requestAnimationFrame(() => {
      scrollSelectedRowToTop();
    });

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [isActive, selectedEpisode, totalEpisodes]);

  if (totalEpisodes <= 0) {
    return null;
  }

  const rowCount = Math.ceil(totalEpisodes / PLAY_EPISODE_GRID_COLS);
  const maxScrollHeight =
    scrollable && rowCount > PLAY_EPISODE_GRID_MAX_ROWS
      ? PLAY_EPISODE_GRID_SCROLL_MAX_HEIGHT_PX
      : undefined;
  const selectedRowIndex = Math.floor(
    (selectedEpisode - 1) / PLAY_EPISODE_GRID_COLS,
  );

  return (
    <div
      ref={listRef}
      className={cn(
        'flex min-h-0 flex-col gap-2',
        scrollable && maxScrollHeight !== undefined && 'overflow-y-auto',
        className,
      )}
      style={
        maxScrollHeight !== undefined
          ? { maxHeight: `${maxScrollHeight}px` }
          : undefined
      }
    >
      {Array.from({ length: rowCount }, (_, rowIndex) => {
        const rowStart = rowIndex * PLAY_EPISODE_GRID_COLS + 1;
        const rowEnd = Math.min(
          rowStart + PLAY_EPISODE_GRID_COLS - 1,
          totalEpisodes,
        );

        return (
          <fieldset
            key={rowStart}
            ref={rowIndex === selectedRowIndex ? selectedRowRef : undefined}
            aria-label={t('第 {{n}} 集', { n: rowStart })}
            className={cn(
              'grid w-full grid-cols-5 items-start',
              'm-0 min-w-0 gap-2 border-0 p-0',
            )}
          >
            {Array.from(
              { length: rowEnd - rowStart + 1 },
              (_, index) => rowStart + index,
            ).map((num) => {
              const isSelected = selectedEpisode === num;

              return (
                <Button
                  key={num}
                  type="button"
                  variant="outline"
                  aria-pressed={isSelected}
                  onClick={() => onSelectEpisode(num)}
                  className={cn(
                    'flex h-[62px] w-full items-center justify-center',
                    'rounded p-0 text-sm font-bold leading-5 shadow-none',
                    'border-0',
                    isSelected
                      ? 'bg-play-episode-selected-surface text-foreground'
                      : 'bg-muted text-foreground',
                    'hover:bg-play-episode-selected-surface hover:text-foreground',
                  )}
                >
                  {num}
                </Button>
              );
            })}
          </fieldset>
        );
      })}
    </div>
  );
}
