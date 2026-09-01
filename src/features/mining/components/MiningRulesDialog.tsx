import { useTranslation } from 'react-i18next';

import { AppDialog } from '@/components/common/AppDialog';
import { APP_DIALOG_SECONDARY_FULL_WIDTH_BUTTON_CLASS } from '@/components/common/appDialogButton';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils';

import { MINING_RULES_DIALOG_TITLE_KEY } from '../miningRulesContent';

import { MiningRulesDialogBody } from './MiningRulesDialogBody';

type MiningRulesDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function MiningRulesDialog({
  open,
  onOpenChange,
}: MiningRulesDialogProps) {
  const { t } = useTranslation();

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t(MINING_RULES_DIALOG_TITLE_KEY)}
      hideHeader
      width={500}
      bodyClassName="p-4"
    >
      {/* Figma 2E3Hw4eqvHRr7c8gaqY82H:1596-110843 */}
      <div className="flex w-full flex-col items-center gap-6">
        <header className="flex w-full shrink-0 flex-col items-center text-center">
          <h2 className="m-0 w-full text-lg leading-[26px] font-bold tracking-[-0.04px] text-foreground">
            {t(MINING_RULES_DIALOG_TITLE_KEY)}
          </h2>
        </header>

        <MiningRulesDialogBody dialogOpen={open} />
      </div>

      {/* 与 main 一致：贴底 sticky，滚动正文时「关闭」始终可见 */}
      <footer
        className={cn(
          'sticky bottom-0 z-10 flex shrink-0 flex-col',
          // 抵消 AppDialog bodyClassName=p-4，贴齐滚动区底边
          '-mx-4 -mb-4 mt-6 w-[calc(100%+2rem)]',
          'border-t border-mining-divider-border bg-background px-4 py-4',
        )}
      >
        <Button
          type="button"
          variant="outline"
          className={APP_DIALOG_SECONDARY_FULL_WIDTH_BUTTON_CLASS}
          onClick={handleClose}
        >
          {t('关闭')}
        </Button>
      </footer>
    </AppDialog>
  );
}
