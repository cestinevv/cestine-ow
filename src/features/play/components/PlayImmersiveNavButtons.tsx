import { useTranslation } from 'react-i18next';

import IconChevronDown from '@/assets/svg/IconChevronDown';
import IconChevronUp from '@/assets/svg/IconChevronUp';
import { Button } from '@/components/ui/button';
import { PlayImmersiveLayoutVariant } from '@/features/play/types/playImmersive';
import { cn } from '@/utils';

type PlayImmersiveNavButtonsProps = {
  layoutVariant: PlayImmersiveLayoutVariant;
  canGoPrev: boolean;
  canGoNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  className?: string;
};

/** 播放区右侧内嵌上下切条（Figma Frame 2085664039） */
export function PlayImmersiveNavButtons({
  layoutVariant,
  canGoPrev,
  canGoNext,
  onPrev,
  onNext,
  className,
}: PlayImmersiveNavButtonsProps) {
  const { t } = useTranslation();
  const isFullscreen = layoutVariant === PlayImmersiveLayoutVariant.Fullscreen;

  return (
    <div
      className={cn(
        // Layout
        'flex flex-col items-center justify-center',
        isFullscreen
          ? 'gap-[15px] rounded-full bg-theater-ip-glass-surface'
          : 'gap-4',
        className,
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={!canGoPrev}
        onClick={onPrev}
        aria-label={t('上一条')}
        className={cn(
          'size-9 rounded-full p-1.5',
          isFullscreen
            ? 'bg-transparent text-white/60 hover:bg-white/20 hover:text-white disabled:bg-transparent disabled:text-white/40'
            : 'bg-muted text-muted-foreground hover:bg-muted hover:text-foreground disabled:bg-muted disabled:text-muted-foreground/55',
          'disabled:opacity-100 disabled:cursor-not-allowed',
        )}
      >
        <IconChevronUp className="size-6" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={!canGoNext}
        onClick={onNext}
        aria-label={t('下一条')}
        className={cn(
          'size-9 rounded-full p-1.5',
          isFullscreen
            ? 'bg-transparent text-white/60 hover:bg-white/20 hover:text-white disabled:bg-transparent disabled:text-white/40'
            : 'bg-muted text-muted-foreground hover:bg-muted hover:text-foreground disabled:bg-muted disabled:text-muted-foreground/55',
          'disabled:opacity-100 disabled:cursor-not-allowed',
        )}
      >
        <IconChevronDown className="size-6" />
      </Button>
    </div>
  );
}
