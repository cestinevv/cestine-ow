import { useTranslation } from 'react-i18next';

import IconX from '@/assets/svg/IconX';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { PlayEpisodeGrid } from '@/features/play/components/PlayEpisodeGrid';
import { cn } from '@/utils';

type PlayWatchEpisodeSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalEpisodes: number;
  selectedEpisode: number;
  onSelectEpisode: (episode: number) => void;
};

export function PlayWatchEpisodeSheet({
  open,
  onOpenChange,
  totalEpisodes,
  selectedEpisode,
  onSelectEpisode,
}: PlayWatchEpisodeSheetProps) {
  const { t } = useTranslation();

  const handleSelectEpisode = (episode: number) => {
    onSelectEpisode(episode);
    onOpenChange(false);
  };

  if (totalEpisodes <= 0) {
    return null;
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        overlayClassName={cn(
          'z-[210]',
          'bg-black/50 supports-backdrop-filter:backdrop-blur-md',
        )}
        className={cn(
          'z-[210] flex max-h-[min(85dvh,560px)] flex-col gap-0',
          'rounded-t-2xl p-0 pb-[max(1rem,env(safe-area-inset-bottom))]',
          'border-t border-border bg-card text-card-foreground',
        )}
      >
        <SheetHeader
          className={cn('shrink-0 border-b border-border px-4 py-3')}
        >
          <div className={cn('flex w-full items-center justify-between gap-3')}>
            <SheetTitle
              className={cn(
                'min-w-0 flex-1 text-left',
                'text-lg font-bold leading-[26px] tracking-[-0.04px]',
              )}
            >
              {t('选集')}
            </SheetTitle>
            <div className={cn('flex shrink-0 items-center gap-3')}>
              <span className={cn('text-sm leading-5 text-muted-foreground')}>
                {t('共 {{n}} 集', { n: totalEpisodes })}
              </span>
              <SheetClose
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className={cn('shrink-0 rounded-full')}
                    aria-label={t('关闭')}
                  />
                }
              >
                <IconX className="size-4" />
              </SheetClose>
            </div>
          </div>
        </SheetHeader>
        <div className={cn('flex min-h-0 flex-1 flex-col p-4')}>
          <PlayEpisodeGrid
            totalEpisodes={totalEpisodes}
            selectedEpisode={selectedEpisode}
            onSelectEpisode={handleSelectEpisode}
            scrollable={false}
            isActive={open}
            className={cn('min-h-0 flex-1 overflow-y-auto')}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
