import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import IconChevronLeft from '@/assets/svg/IconChevronLeft';
import { AppDialog } from '@/components/common/AppDialog';
import { APP_DIALOG_SECONDARY_FULL_WIDTH_BUTTON_CLASS } from '@/components/common/appDialogButton';
import { Button } from '@/components/ui/button';
import { PlayBoundActorAvatar } from '@/features/play/components/PlayBoundActorAvatar';
import type { PlayDramaActorInfo } from '@/features/play/playFormat';
import { openRouteInNewTab } from '@/routing/newTabRouteLink';
import { cn, formatNumber } from '@/utils';

type PlayActorCompensationDialogProps = {
  actors: PlayDramaActorInfo[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** Figma 160:136811 — 剧场卡片参演角色 IP 与片酬弹窗。 */
export function PlayActorCompensationDialog({
  actors,
  open,
  onOpenChange,
}: PlayActorCompensationDialogProps) {
  const { t } = useTranslation();
  const router = useRouter();

  const handleActorClick = (actorId: string) => {
    if (!actorId) {
      return;
    }

    openRouteInNewTab(router, {
      to: '/actor/$actorId',
      params: { actorId },
    });
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('参演角色IP')}
      width={343}
      bodyScroll={false}
      hideHeader
      disablePointerDismissal={false}
      bodyClassName="flex flex-col gap-6 p-4"
    >
      <h2 className="text-center text-lg leading-6.5 font-bold tracking-[-0.04px] text-foreground">
        {t('参演角色IP')}
      </h2>

      <ul className="flex list-none flex-col gap-2 p-0">
        {actors.map((actor) => (
          <li key={actor.id}>
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleActorClick(actor.id ?? '')}
              className={cn(
                // Layout & Positioning
                'flex h-auto w-full items-center justify-between',
                // Sizing & Spacing
                'gap-2 rounded-full p-2',
                // Visuals & Typography
                'border-[0.5px] border-white/15 bg-secondary text-foreground backdrop-blur-[2.5px]',
                // Interactions & States
                'hover:bg-secondary/80',
              )}
            >
              <span className="flex min-w-0 flex-1 items-center gap-3">
                <PlayBoundActorAvatar
                  avatar={actor.avatar}
                  name={actor.name}
                  className="size-11"
                />
                <span className="flex min-w-0 flex-col items-start gap-0.5">
                  <strong className="max-w-full truncate text-[13px] leading-4.5 font-bold">
                    {actor.name}
                  </strong>
                  {actor.computingPower !== undefined ? (
                    <span className="shrink-0 whitespace-nowrap text-xs leading-4 font-medium tracking-[0.04px] text-warning">
                      {t('片酬 {{amount}} STORY/h', {
                        amount: formatNumber(actor.computingPower, 4),
                      })}
                    </span>
                  ) : null}
                </span>
              </span>
              <IconChevronLeft className="size-6 shrink-0 rotate-180 text-muted-foreground" />
            </Button>
          </li>
        ))}
      </ul>

      <Button
        type="button"
        variant="outline"
        onClick={handleClose}
        className={APP_DIALOG_SECONDARY_FULL_WIDTH_BUTTON_CLASS}
      >
        {t('关闭')}
      </Button>
    </AppDialog>
  );
}
