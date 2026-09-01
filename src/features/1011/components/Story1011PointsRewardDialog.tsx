import { useTranslation } from 'react-i18next';

import { AppDialog } from '@/components/common/AppDialog';
import { APP_DIALOG_PRIMARY_FULL_WIDTH_BUTTON_CLASS } from '@/components/common/appDialogButton';
import { Button } from '@/components/ui/button';
import { formatNumber } from '@/utils/formatNumber';

import { story1011Media } from '../constants/story1011Media';

type Story1011PointsRewardDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 本次获得积分 */
  points: number | undefined;
};

/** 签到 / 任务领取成功：积分奖励弹窗 — Figma 7090:92230 */
export function Story1011PointsRewardDialog({
  open,
  onOpenChange,
  points,
}: Story1011PointsRewardDialogProps) {
  const { t } = useTranslation();

  /** 确认关闭奖励弹窗 */
  function handleConfirm() {
    onOpenChange(false);
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      bodyScroll={false}
      width={343}
      hideHeader
      bodyClassName="px-4 pt-4 pb-4"
      title={t('领取成功')}
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <img
          src={story1011Media.pointsRewardCoin}
          alt=""
          width={64}
          height={64}
          className="size-16 object-cover"
        />

        <p className="m-0 w-full text-lg leading-6.5 font-bold tracking-[-0.04px] text-foreground">
          {points === undefined
            ? t('积分 +{{points}}', { points: '—' })
            : t('积分 +{{points}}', { points: formatNumber(points) })}
        </p>

        <Button
          type="button"
          onClick={handleConfirm}
          className={APP_DIALOG_PRIMARY_FULL_WIDTH_BUTTON_CLASS}
        >
          {t('确认')}
        </Button>
      </div>
    </AppDialog>
  );
}
