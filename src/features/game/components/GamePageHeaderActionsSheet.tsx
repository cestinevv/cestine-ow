import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import IconHistory from '@/assets/svg/IconHistory';
import IconPointStar from '@/assets/svg/IconPointStar';
import IconReceipt from '@/assets/svg/IconReceipt';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { cn } from '@/utils';

type GamePageHeaderActionsSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenRules: () => void;
  onOpenWeekPoolHelp: () => void;
  onOpenSettlementRecords: () => void;
};

type ActionItem = {
  id: string;
  labelKey: string;
  icon: ReactNode;
  onSelect: () => void;
};

export function GamePageHeaderActionsSheet({
  open,
  onOpenChange,
  onOpenRules,
  onOpenWeekPoolHelp,
  onOpenSettlementRecords,
}: GamePageHeaderActionsSheetProps) {
  const { t } = useTranslation();

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleSelect = (action: () => void) => () => {
    action();
    onOpenChange(false);
  };

  const actionItems: ActionItem[] = [
    {
      id: 'rules',
      labelKey: '规则',
      icon: <IconReceipt className="size-6 shrink-0" />,
      onSelect: onOpenRules,
    },
    {
      id: 'week-pool',
      labelKey: '片酬与奖池',
      icon: <IconPointStar className="size-6 shrink-0" />,
      onSelect: onOpenWeekPoolHelp,
    },
    {
      id: 'settlement',
      labelKey: '每周结算记录',
      icon: <IconHistory className="size-6 shrink-0" />,
      onSelect: onOpenSettlementRecords,
    },
  ];

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
          'z-[210] flex flex-col gap-4',
          'rounded-t-2xl px-4 pt-0 pb-[max(2.125rem,env(safe-area-inset-bottom))]',
          'border-t-0 bg-muted',
        )}
      >
        <div className="flex w-full items-center justify-center p-2.5">
          <div className="h-1 w-12 rounded-full bg-muted-foreground/30" />
        </div>

        <div className="flex w-full flex-col gap-3">
          <div className="overflow-hidden rounded-xl bg-card">
            {actionItems.map((item, index) => (
              <div key={item.id}>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleSelect(item.onSelect)}
                  className={cn(
                    'flex h-auto w-full items-center justify-start gap-3 rounded-none p-4',
                    'text-[15px] leading-[22px] font-normal text-foreground',
                    'hover:bg-muted/60',
                  )}
                >
                  {item.icon}
                  <span>{t(item.labelKey)}</span>
                </Button>
                {index < actionItems.length - 1 ? (
                  <div className="mx-4 border-b border-border" />
                ) : null}
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            className={cn(
              'h-11 w-full rounded-xl border-[1.5px] border-game-header-action-border',
              'text-sm leading-5 font-bold text-foreground',
            )}
          >
            {t('取消')}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
