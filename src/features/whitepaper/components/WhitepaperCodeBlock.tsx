import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/utils';

type Props = {
  children: ReactNode;
};

/** Figma 灰色「代码块」容器（节点内文案仍为可见中文，走 i18n） */
export function WhitepaperCodeBlock({ children }: Props) {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        'flex w-full min-w-0 flex-col gap-4 rounded-2xl border border-border bg-wallet-surface-muted p-4',
        'text-sm leading-6 tracking-[-0.08px] text-foreground',
      )}
    >
      <p className="text-sm leading-6 text-muted-foreground">{t('代码块')}</p>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
