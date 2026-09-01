import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import IconChevronLeft from '@/assets/svg/IconChevronLeft';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils';

type MobileDrawerSubpageProps = {
  children: ReactNode;
  contentClassName?: string;
  onBack: () => void;
  titleKey: string;
};

/** 移动抽屉内的通用子页骨架，返回行为始终由父级状态显式控制。 */
export function MobileDrawerSubpage({
  children,
  contentClassName,
  onBack,
  titleKey,
}: MobileDrawerSubpageProps) {
  const { t } = useTranslation();

  return (
    <section className="flex min-h-0 flex-1 flex-col pt-[max(12px,env(safe-area-inset-top))]">
      <header className="grid h-11 shrink-0 grid-cols-[1fr_auto_1fr] items-center px-4">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="-ml-2 size-9 justify-self-start rounded-full text-foreground"
          aria-label={t('返回')}
        >
          <IconChevronLeft className="size-6" />
        </Button>
        <h2 className="text-[18px] leading-[26px] font-bold tracking-[-0.04px] text-foreground">
          {t(titleKey)}
        </h2>
        <span aria-hidden />
      </header>

      <div
        className={cn(
          'min-h-0 flex-1 overflow-y-auto px-4 pb-[max(24px,env(safe-area-inset-bottom))]',
          contentClassName,
        )}
      >
        {children}
      </div>
    </section>
  );
}
