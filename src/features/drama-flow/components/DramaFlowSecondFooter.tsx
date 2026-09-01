import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useDramaFlowConfig } from '@/features/drama-flow/contexts/DramaFlowConfigContext';
import { cn } from '@/utils';

type CreateSecondFooterProps = {
  onSaveDraft: () => void;
  onPrev: () => void;
  onNext: () => void;
  nextDisabled: boolean;
  /** 上传等异步流程中禁用「上一步」，避免路由切换与上传并发。 */
  prevDisabled?: boolean;
  /** 主操作按钮文案的 i18n key，默认「下一步」。 */
  nextLabelKey?: string;
  /** 主操作进行中（如提交审核）：禁用主按钮并切换文案。 */
  nextPending?: boolean;
};

export function DramaFlowSecondFooter({
  onSaveDraft,
  onPrev,
  onNext,
  nextDisabled,
  prevDisabled = false,
  nextLabelKey = '下一步',
  nextPending = false,
}: CreateSecondFooterProps) {
  const { t } = useTranslation();
  const { mode } = useDramaFlowConfig();
  const isEditMode = mode === 'edit';

  const primaryDisabled = nextDisabled || nextPending;

  const footerButtonBaseClassName = cn(
    'h-auto min-w-0 flex-1 rounded-xl px-6 py-2.5',
    'text-sm leading-5 font-bold',
    'md:flex-none',
  );

  return (
    <footer
      className={cn(
        'flex w-full flex-row items-stretch gap-3',
        'md:items-center md:justify-end',
      )}
    >
      {isEditMode ? null : (
        <Button
          type="button"
          variant="outline"
          onClick={onSaveDraft}
          className={cn(
            footerButtonBaseClassName,
            'border-[1.5px] border-border text-foreground',
          )}
        >
          {t('保存草稿')}
        </Button>
      )}
      <Button
        type="button"
        variant="outline"
        disabled={prevDisabled}
        onClick={onPrev}
        className={cn(
          footerButtonBaseClassName,
          'border-[1.5px] border-border text-foreground',
        )}
      >
        {t('上一步')}
      </Button>
      <Button
        type="button"
        variant="ghost"
        disabled={primaryDisabled}
        onClick={onNext}
        className={cn(
          footerButtonBaseClassName,
          primaryDisabled
            ? [
                'cursor-not-allowed border-transparent',
                'bg-button-disabled-surface text-button-disabled-on-surface',
                'hover:bg-button-disabled-surface hover:text-button-disabled-on-surface',
                'disabled:bg-button-disabled-surface disabled:text-button-disabled-on-surface',
                'disabled:opacity-100',
              ]
            : [
                'border-foreground bg-foreground text-background',
                'hover:bg-foreground/90 hover:text-background',
              ],
        )}
      >
        {nextPending ? (
          <span className="inline-flex items-center justify-center gap-2">
            <Spinner className="size-4 text-background" />
            <span>{t(nextLabelKey)}</span>
          </span>
        ) : (
          t(nextLabelKey)
        )}
      </Button>
    </footer>
  );
}
