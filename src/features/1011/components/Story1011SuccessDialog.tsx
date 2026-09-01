import { useTranslation } from 'react-i18next';

import IconStoryCheckinSuccess from '@/assets/svg/IconStoryCheckinSuccess';
import { AppDialog } from '@/components/common/AppDialog';
import { APP_DIALOG_PRIMARY_BUTTON_CLASS } from '@/components/common/appDialogButton';
import { Button } from '@/components/ui/button';
import { GameDialogSubmitLabel } from '@/features/game/components/GameDialogSubmitLabel';

type Story1011SuccessDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExplore: () => void;
  isExplorePending?: boolean;
};

export function Story1011SuccessDialog({
  open,
  onOpenChange,
  onExplore,
  isExplorePending = false,
}: Story1011SuccessDialogProps) {
  const { t } = useTranslation();

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      bodyScroll={false}
      width={424}
      bodyClassName="p-6"
      hideHeader
      title={t('故事已提交！ 你已成功登船')}
    >
      <div className="flex flex-col items-center gap-6 text-center">
        <IconStoryCheckinSuccess className="size-16 text-story-checkin-accent" />

        <div className="flex w-full flex-col gap-3">
          <p className="m-0 text-lg leading-6.5 font-bold tracking-[-0.04px] text-foreground">
            {t('故事已提交！ 你已成功登船')}
          </p>
          <p className="m-0 text-sm leading-5 font-medium text-muted-foreground">
            {t('现在可以分享故事或完成任务赚取积分，积分越高，USDC 奖励越多。')}
          </p>
        </div>

        {/* Figma 6952:37147 — 开始探索（主渐变，整行） */}
        <Button
          type="button"
          onClick={onExplore}
          disabled={isExplorePending}
          className={APP_DIALOG_PRIMARY_BUTTON_CLASS}
        >
          <GameDialogSubmitLabel isPending={isExplorePending}>
            {t('开始探索')}
          </GameDialogSubmitLabel>
        </Button>
      </div>
    </AppDialog>
  );
}
