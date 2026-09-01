import { useTranslation } from 'react-i18next';

import { PlayEpisodeGrid } from '@/features/play/components/PlayEpisodeGrid';
import { focusPlaybackToPageTop } from '@/hooks/usePlaybackController';
import { cn } from '@/utils';

type PlayEpisodesSidebarProps = {
  className?: string;
  totalEpisodes: number;
  selectedEpisode: number;
  onSelectEpisode: (episode: number) => void;
  /** 移动端嵌入选集卡时隐藏标题行 */
  hideHeader?: boolean;
};

export function PlayEpisodesSidebar({
  className,
  totalEpisodes,
  selectedEpisode,
  onSelectEpisode,
  hideHeader = false,
}: PlayEpisodesSidebarProps) {
  const { t } = useTranslation();

  const handleSelectEpisode = (episode: number) => {
    onSelectEpisode(episode);
    focusPlaybackToPageTop();
  };

  if (totalEpisodes <= 0) {
    return null;
  }

  return (
    <section
      aria-label={hideHeader ? t('选集') : undefined}
      aria-labelledby={hideHeader ? undefined : 'play-episodes-sidebar-heading'}
      className={cn(
        'flex min-h-0 w-full flex-col gap-4',
        'max-lg:rounded-none max-lg:bg-transparent max-lg:p-0',
        'lg:min-h-0 lg:flex-1 lg:overflow-hidden',
        className,
      )}
    >
      {hideHeader ? null : (
        <div className={cn('flex w-full items-center justify-between gap-3')}>
          <h2
            id="play-episodes-sidebar-heading"
            className={cn(
              'text-lg font-bold leading-[26px] tracking-[-0.04px] text-foreground',
            )}
          >
            {t('选集')}
          </h2>
          <span
            className={cn('shrink-0 text-sm leading-5 text-muted-foreground')}
          >
            {t('共 {{n}} 集', { n: totalEpisodes })}
          </span>
        </div>
      )}
      <PlayEpisodeGrid
        totalEpisodes={totalEpisodes}
        selectedEpisode={selectedEpisode}
        onSelectEpisode={handleSelectEpisode}
        scrollable
        className={cn('min-h-0 flex-1')}
      />
    </section>
  );
}
