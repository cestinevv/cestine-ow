import { useTranslation } from 'react-i18next';

import IconAlertTriangle from '@/assets/svg/IconAlertTriangle';
import IconHeartBroken from '@/assets/svg/IconHeartBroken';
import IconPlayerAspectRatio from '@/assets/svg/IconPlayerAspectRatio';
import IconPlayerAspectRatioExit from '@/assets/svg/IconPlayerAspectRatioExit';
import IconPlayerContinuousPlay from '@/assets/svg/IconPlayerContinuousPlay';
import { AppDialog } from '@/components/common/AppDialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/utils';

type PlayWatchMoreSettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNotInterested: () => void;
  onReport: () => void;
  isCleanScreen: boolean;
  onToggleCleanScreen: () => void;
  continuousPlay: boolean;
  onContinuousPlayChange: (checked: boolean) => void;
  showFeedbackActions?: boolean;
};

export function PlayWatchMoreSettingsDialog({
  open,
  onOpenChange,
  onNotInterested,
  onReport,
  isCleanScreen,
  onToggleCleanScreen,
  continuousPlay,
  onContinuousPlayChange,
  showFeedbackActions = true,
}: PlayWatchMoreSettingsDialogProps) {
  const { t } = useTranslation();
  const rowClassName = cn(
    'flex h-14 w-full items-center justify-start gap-3 rounded-none px-4 py-0',
    'text-[15px] leading-[22px] font-normal text-foreground',
    'hover:bg-accent hover:text-accent-foreground',
  );

  const handleNotInterested = () => {
    onOpenChange(false);
    onNotInterested();
  };

  const handleReport = () => {
    onOpenChange(false);
    onReport();
  };

  const handleToggleCleanScreen = () => {
    onOpenChange(false);
    onToggleCleanScreen();
  };

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('更多')}
      width={390}
      bodyScroll={false}
      disablePointerDismissal={false}
      hideCloseButton
      headerClassName="h-10 gap-0 bg-background px-4 py-0"
      headerContent={
        <Button
          type="button"
          variant="ghost"
          className="h-10 w-full rounded-none p-0 hover:bg-transparent"
          aria-label={t('关闭')}
          onClick={() => onOpenChange(false)}
        >
          <span className="h-1 w-12 rounded-[2px] bg-button-disabled-foreground" />
        </Button>
      }
      contentClassName="rounded-t-2xl bg-background"
      bodyClassName={cn(
        'flex flex-col gap-3 px-4',
        'pb-[max(2.75rem,env(safe-area-inset-bottom))]',
      )}
    >
      {showFeedbackActions ? (
        <section className="overflow-hidden rounded-xl bg-site-settings-panel-surface">
          <Button
            type="button"
            variant="ghost"
            className={rowClassName}
            onClick={handleNotInterested}
          >
            <IconHeartBroken className="size-6 shrink-0" />
            <span>{t('不感兴趣')}</span>
          </Button>
          <div className="ml-13 border-t border-border" />
          <Button
            type="button"
            variant="ghost"
            className={rowClassName}
            onClick={handleReport}
          >
            <IconAlertTriangle className="size-6 shrink-0" />
            <span>{t('举报')}</span>
          </Button>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-xl bg-site-settings-panel-surface">
        <Button
          type="button"
          variant="ghost"
          className={rowClassName}
          onClick={handleToggleCleanScreen}
        >
          {isCleanScreen ? (
            <IconPlayerAspectRatioExit className="size-6 shrink-0" />
          ) : (
            <IconPlayerAspectRatio className="size-6 shrink-0" />
          )}
          <span>{isCleanScreen ? t('退出清屏') : t('清屏')}</span>
        </Button>
        <div className="ml-13 border-t border-border" />
        <div
          className={cn(rowClassName, 'justify-between hover:bg-transparent')}
        >
          <div className="flex items-center gap-3">
            <IconPlayerContinuousPlay className="size-6 shrink-0" />
            <span>{t('连播')}</span>
          </div>
          <Switch
            size="lg"
            checked={continuousPlay}
            onCheckedChange={onContinuousPlayChange}
            aria-label={t('连播')}
            className={cn(
              'data-checked:bg-play-toggle-checked data-unchecked:bg-play-toggle-unchecked',
              'dark:data-checked:bg-play-toggle-checked dark:data-unchecked:bg-play-toggle-unchecked',
              '[&_[data-slot=switch-thumb]]:ml-[0.5px] [&_[data-slot=switch-thumb]]:!size-[21px]',
              '[&_[data-slot=switch-thumb]]:!bg-play-toggle-thumb [&_[data-slot=switch-thumb]]:shadow-md',
            )}
          />
        </div>
      </section>
    </AppDialog>
  );
}
