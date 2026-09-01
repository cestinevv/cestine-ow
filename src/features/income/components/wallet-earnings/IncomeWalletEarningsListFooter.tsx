import type { Ref } from 'react';
import { useTranslation } from 'react-i18next';

import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/utils';

type IncomeWalletEarningsListFooterProps = {
  sentinelRef: Ref<HTMLDivElement>;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  visible: boolean;
  showTopBorder?: boolean;
  className?: string;
};

export function IncomeWalletEarningsListFooter({
  sentinelRef,
  isFetchingNextPage,
  hasNextPage,
  visible,
  showTopBorder = true,
  className,
}: IncomeWalletEarningsListFooterProps) {
  const { t } = useTranslation();

  if (!visible) {
    return null;
  }

  return (
    <div
      ref={sentinelRef}
      className={cn(
        'flex w-full min-h-11 flex-col items-center justify-center py-3',
        showTopBorder && 'border-t border-history-border',
        className,
      )}
    >
      {isFetchingNextPage ? (
        <Spinner className="size-5 text-muted-foreground" />
      ) : !hasNextPage ? (
        <p className="text-xs leading-4 text-wallet-text-tertiary">
          {t('没有更多数据')}
        </p>
      ) : null}
    </div>
  );
}
