import { useTranslation } from 'react-i18next';

import { AppDialog } from '@/components/common/AppDialog';
import { APP_DIALOG_SECONDARY_FULL_WIDTH_BUTTON_CLASS } from '@/components/common/appDialogButton';
import { Button } from '@/components/ui/button';
import {
  formatPlazaCompletionCount,
  formatPlazaPayMultiplier,
  getSupportedPayUpgradeLevel,
  listPlazaPayUpgradeRules,
} from '@/features/actor/plazaActorStoryRate';
import { useConfigStore } from '@/stores/config';
import { cn } from '@/utils';

type ActorPayUpgradeRulesDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  completedViewCount?: number;
};

export function ActorPayUpgradeRulesDialog({
  open,
  onOpenChange,
  completedViewCount,
}: ActorPayUpgradeRulesDialogProps) {
  const { t } = useTranslation();
  const initConfig = useConfigStore((state) => state.initConfig);
  const rows = listPlazaPayUpgradeRules(initConfig ?? undefined);
  const supportedLevel = getSupportedPayUpgradeLevel(rows, completedViewCount);

  // 关闭片酬升级规则弹窗
  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('片酬升级规则')}
      hideHeader
      width={343}
      bodyScroll={false}
      bodyClassName="p-4"
    >
      {/* Figma 655:149477 — 343 宽，p-16 / gap-24 */}
      <div className="flex flex-col items-center gap-6">
        <header className="w-full text-center">
          <h2 className="m-0 w-full text-lg leading-[26px] font-bold tracking-[-0.04px] text-foreground">
            {t('片酬升级规则')}
          </h2>
        </header>

        <div className="flex w-full flex-col items-center gap-1.5 rounded-xl bg-muted p-3 text-center">
          <p className="m-0 w-full text-xs leading-4 tracking-[0.04px] text-muted-foreground">
            {t('该IP参演短剧的当前完播数可支持角色升级至')}
          </p>
          <p className="m-0 w-full text-[17px] leading-[25px] font-bold text-foreground">
            {supportedLevel === undefined ? '-' : `Lv.${supportedLevel}`}
          </p>
        </div>

        <div className="flex w-full flex-col gap-3">
          <ul className="m-0 flex w-full list-none flex-col gap-2 rounded-xl bg-muted p-3">
            {rows.map((row) => {
              const highlighted = row.level === supportedLevel;

              return (
                <li
                  key={row.level}
                  className={cn(
                    'flex w-full items-center gap-1.5 px-1.5 py-1',
                    'text-xs leading-4 tracking-[0.04px]',
                    highlighted && 'rounded bg-game-panel-row-surface',
                  )}
                >
                  <span className="min-w-0 flex-1 font-medium text-foreground">
                    {`Lv.${row.level}`}
                  </span>
                  <span className="min-w-0 flex-1 text-center text-muted-foreground">
                    {row.completionThreshold === undefined
                      ? '-'
                      : t('{{count}} 完播', {
                          count: formatPlazaCompletionCount(
                            row.completionThreshold,
                          ),
                        })}
                  </span>
                  <span className="min-w-0 flex-1 text-right font-bold text-foreground">
                    {t('片酬 ×{{multiplier}}', {
                      multiplier: formatPlazaPayMultiplier(
                        row.miningCoefficient,
                      ),
                    })}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={handleClose}
          className={APP_DIALOG_SECONDARY_FULL_WIDTH_BUTTON_CLASS}
        >
          {t('知道了')}
        </Button>
      </div>
    </AppDialog>
  );
}
