import { useTranslation } from 'react-i18next';

import IconChevronDown from '@/assets/svg/IconChevronDown';
import IconPlayerCleanScreen from '@/assets/svg/IconPlayerCleanScreen';
import IconPlayerCleanScreenExit from '@/assets/svg/IconPlayerCleanScreenExit';
import IconPlayerFullscreen from '@/assets/svg/IconPlayerFullscreen';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils';

type PlayWatchEpisodeBarProps = {
  totalEpisodes?: number;
  onEpisodeBarClick: () => void;
  onToggleFullscreen: () => void;
  /** H5：清屏图标；PC：全屏图标 */
  isMobileViewport?: boolean;
  /** H5 清屏态 */
  isCleanScreen?: boolean;
};

function PlayWatchScreenModeButton({
  isMobileViewport,
  isCleanScreen,
  onToggleFullscreen,
}: {
  isMobileViewport: boolean;
  isCleanScreen: boolean;
  onToggleFullscreen: () => void;
}) {
  const { t } = useTranslation();

  const ariaLabel = isMobileViewport
    ? isCleanScreen
      ? t('退出清屏')
      : t('清屏')
    : t('全屏');

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      onClick={onToggleFullscreen}
      className={cn(
        'size-6 shrink-0 rounded-full p-0',
        'text-white hover:bg-white/10 hover:text-white',
      )}
      aria-label={ariaLabel}
    >
      {isMobileViewport ? (
        isCleanScreen ? (
          <IconPlayerCleanScreenExit className="size-6" />
        ) : (
          <IconPlayerCleanScreen className="size-6" />
        )
      ) : (
        <IconPlayerFullscreen className="size-6" />
      )}
    </Button>
  );
}

export function PlayWatchEpisodeBar({
  totalEpisodes,
  onEpisodeBarClick,
  onToggleFullscreen,
  isMobileViewport = true,
  isCleanScreen = false,
}: PlayWatchEpisodeBarProps) {
  const { t } = useTranslation();

  const episodeBarLabel =
    totalEpisodes !== undefined
      ? t('选集 · 已完结 · 全{{count}}集', { count: totalEpisodes })
      : t('选集');

  return (
    <div className={cn('flex w-full items-center', 'gap-4')}>
      <Button
        type="button"
        variant="ghost"
        onClick={onEpisodeBarClick}
        className={cn(
          'flex h-auto min-h-11 flex-1 items-center justify-between',
          'rounded-[8px] px-4 py-2.5',
          'bg-secondary',
          'text-xs leading-4 font-normal text-foreground',
          'hover:bg-muted hover:text-foreground',
          'active:bg-muted active:text-foreground',
          'aria-expanded:bg-secondary aria-expanded:text-foreground',
        )}
      >
        <span>{episodeBarLabel}</span>
        <IconChevronDown className="size-6 rotate-180 text-white" />
      </Button>
      <PlayWatchScreenModeButton
        isMobileViewport={isMobileViewport}
        isCleanScreen={isCleanScreen}
        onToggleFullscreen={onToggleFullscreen}
      />
    </div>
  );
}
