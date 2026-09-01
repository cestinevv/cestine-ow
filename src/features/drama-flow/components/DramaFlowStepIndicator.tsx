import { useTranslation } from 'react-i18next';

import { cn, SHOW_DEV_ONLY_UI } from '@/utils';

const ALL_STEP_DEFS = [
  { step: 1, labelKey: '基本信息' },
  { step: 2, labelKey: '剧集管理' },
  { step: 3, labelKey: '绑定 IP', devOnly: true },
] as const;

const STEP_DEFS = ALL_STEP_DEFS.filter(
  (item) => !('devOnly' in item && item.devOnly) || SHOW_DEV_ONLY_UI,
);

type CreateFirstStepIndicatorProps = {
  currentStep: 1 | 2 | 3;
};

export function DramaFlowStepIndicator({
  currentStep,
}: CreateFirstStepIndicatorProps) {
  const { t } = useTranslation();

  return (
    <nav aria-label={t('创建短剧步骤')} className="flex w-full items-start">
      <ol className="flex flex-wrap gap-6">
        {STEP_DEFS.map(({ step, labelKey }) => {
          const doneOrCurrent = step <= currentStep;

          return (
            <li key={step} className="flex items-center gap-2">
              <span
                className={cn(
                  'flex size-6 shrink-0 items-center justify-center rounded-full',
                  'text-sm leading-5',
                  doneOrCurrent
                    ? 'bg-foreground text-background'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                {step}
              </span>
              <span
                className={cn(
                  'text-xs leading-4 font-medium tracking-[0.04px]',
                  doneOrCurrent ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {t(labelKey)}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
