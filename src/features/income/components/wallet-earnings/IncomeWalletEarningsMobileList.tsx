import { useTranslation } from 'react-i18next';

import { AppDateTimeText } from '@/components/common/AppDateTimeText';
import AppLoadingContainer from '@/components/common/AppLoadingContainer';
import {
  getIncomeWalletEarningsSourceDisplay,
  type IncomeWalletEarningsRow,
} from '@/features/income/incomeWalletEarningsFormat';
import { cn, formatNumber } from '@/utils';

type IncomeWalletEarningsMobileListProps = {
  rows: IncomeWalletEarningsRow[];
  isLoading?: boolean;
  isError?: boolean;
};

/** Figma 4995:56698 — 右侧来源：#编号 + 名称 */
function IncomeWalletEarningsMobileSource({
  row,
}: {
  row: IncomeWalletEarningsRow;
}) {
  const actorName = row.sourceLabelParams?.actorName;
  const tokenId = row.sourceLabelParams?.tokenId;

  if (actorName && tokenId) {
    return (
      <div
        className={cn(
          'flex min-w-0 max-w-full items-center justify-end gap-2',
          'text-[10px] leading-3 tracking-[0.08px]',
        )}
      >
        <span className="shrink-0 font-normal whitespace-nowrap text-wallet-text-tertiary">
          #{tokenId}
        </span>
        <span
          className="line-clamp-2 min-w-0 text-right font-medium break-all text-wallet-text-secondary"
          title={actorName}
        >
          {actorName}
        </span>
      </div>
    );
  }

  const display = getIncomeWalletEarningsSourceDisplay(row);
  if (display === '-') {
    return null;
  }

  return (
    <p
      className={cn(
        'line-clamp-2 max-w-full text-right font-normal break-all',
        'text-[10px] leading-3 tracking-[0.08px] text-wallet-text-secondary',
      )}
      title={display}
    >
      {display}
    </p>
  );
}

export function IncomeWalletEarningsMobileList({
  rows,
  isLoading = false,
  isError = false,
}: IncomeWalletEarningsMobileListProps) {
  const { t } = useTranslation();

  return (
    <AppLoadingContainer
      data={rows}
      isLoading={isLoading}
      isError={isError}
      minHeight={280}
      emptyDescription={t('暂无记录')}
    >
      <ul className="flex w-full flex-col items-center">
        {rows.map((row) => (
          <li
            key={row.id}
            className={cn(
              'relative flex min-h-15 w-full items-center justify-center',
              'border-b border-history-border',
            )}
          >
            <div className="flex w-full items-center justify-between gap-3">
              <div className="flex min-w-0 flex-1 flex-col gap-1 items-start justify-center">
                <p className="truncate text-sm leading-5 font-medium text-foreground">
                  {t(row.typeLabelKey)}
                </p>
                <AppDateTimeText
                  value={row.createdAt}
                  pattern="YYYY/MM/DD HH:mm"
                  layout="responsive-split"
                  className="text-[10px] leading-3 tracking-[0.08px] text-wallet-text-tertiary"
                />
              </div>

              <div className="flex min-w-0 max-w-[55%] shrink-0 flex-col gap-1 items-end justify-center">
                <p className="whitespace-nowrap text-sm leading-5 font-medium text-language-switcher-active">
                  {row.amount !== undefined
                    ? `${formatNumber(row.amount, 2)} ${row.assetCode}`
                    : '-'}
                </p>
                <IncomeWalletEarningsMobileSource row={row} />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </AppLoadingContainer>
  );
}
