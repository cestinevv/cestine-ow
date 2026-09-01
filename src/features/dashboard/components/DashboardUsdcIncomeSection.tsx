import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { UsdcIncomeStatsResponse } from '@/api/__generated__/wallet/model/usdcIncomeStatsResponse';
import {
  useGetIncomeStats,
  useGetLedger,
} from '@/api/__generated__/wallet/platform-dashboard-controller/platform-dashboard-controller';
import { DEFAULT_PAGE_SIZE } from '@/constants';
import { unwrapOrvalPayload } from '@/features/mining/miningFormat';
import { cn } from '@/utils';
import {
  formatDashboardUsdAmount,
  mergeDashboardLedgerPages,
} from '../utils/dashboardFormat';
import { DashboardPreviewSectionHeader } from './DashboardPreviewSectionHeader';
import { DashboardSectionTitle } from './DashboardSectionTitle';
import { DashboardUsdcLedgerDialog } from './DashboardUsdcLedgerDialog';
import { DashboardUsdcLedgerTable } from './DashboardUsdcLedgerTable';

function FeeStatCard({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <article
      className={cn(
        'flex min-w-0 flex-1 flex-col gap-1 p-4 md:gap-[6px] md:p-8',
        'rounded-xl border border-white bg-card md:rounded-2xl md:border-0',
        className,
      )}
    >
      <p className="text-[13px] leading-[18px] text-muted-foreground md:text-sm md:leading-[18px]">
        {label}
      </p>
      <p className="text-base leading-6 font-bold text-foreground md:text-[28px] md:leading-8">
        {value}
      </p>
    </article>
  );
}

function FeeStatRowCard({ label, value }: { label: string; value: string }) {
  return (
    <article
      className={cn(
        'flex w-full items-center justify-between gap-4 p-4 md:hidden',
        'rounded-xl border border-white bg-card',
      )}
    >
      <p className="text-[13px] leading-[18px] text-muted-foreground">
        {label}
      </p>
      <p className="text-base leading-6 font-bold text-foreground">{value}</p>
    </article>
  );
}

export function DashboardUsdcIncomeSection() {
  const { t } = useTranslation();
  const [ledgerDialogOpen, setLedgerDialogOpen] = useState(false);

  const incomeStatsQuery = useGetIncomeStats({
    query: { retry: false },
  });
  const ledgerQuery = useGetLedger(
    { pageSize: DEFAULT_PAGE_SIZE, mark: 0 },
    { query: { retry: false } },
  );

  const incomeStats = unwrapOrvalPayload<UsdcIncomeStatsResponse>(
    incomeStatsQuery.data,
  );
  const ledgerRows = mergeDashboardLedgerPages(
    ledgerQuery.data ? [ledgerQuery.data] : undefined,
  );

  const mintFeeValue = formatDashboardUsdAmount(incomeStats?.mintFee);
  const royaltyValue = formatDashboardUsdAmount(incomeStats?.royalty);
  const staminaFeeValue = formatDashboardUsdAmount(incomeStats?.staminaFee);
  const upgradeFeeValue = formatDashboardUsdAmount(incomeStats?.upgradeFee);
  const txFeeValue = formatDashboardUsdAmount(incomeStats?.txFee);

  // 打开近期 USDC 收入流水弹窗。
  const handleOpenLedgerDialog = () => {
    setLedgerDialogOpen(true);
  };

  return (
    <section className="flex flex-col gap-4 md:gap-8">
      <DashboardSectionTitle title={t('USDC 收入明细')} />

      <div className="flex flex-col gap-2 md:gap-3">
        <div className="grid grid-cols-2 gap-2 md:flex md:flex-row md:gap-3">
          <FeeStatCard label={t('签约费')} value={mintFeeValue} />
          <FeeStatCard label={t('二级版税')} value={royaltyValue} />
        </div>
        <div className="grid grid-cols-2 gap-2 md:flex md:flex-row md:gap-3">
          <FeeStatCard label={t('购买体力费')} value={staminaFeeValue} />
          <FeeStatCard label={t('合成升级费')} value={upgradeFeeValue} />
          <FeeStatCard
            label={t('手续费')}
            value={txFeeValue}
            className="hidden md:flex"
          />
        </div>
        <FeeStatRowCard label={t('手续费')} value={txFeeValue} />
      </div>

      <div
        className={cn(
          'flex flex-col gap-4 p-4 md:gap-6 md:p-8',
          'rounded-2xl border border-white bg-card md:border-0',
        )}
      >
        <DashboardPreviewSectionHeader
          title={t('近期 USDC 收入流水')}
          actionLabel={t('查看更多')}
          onAction={handleOpenLedgerDialog}
        />
        <DashboardUsdcLedgerTable
          rows={ledgerRows}
          isLoading={ledgerQuery.isPending}
          isError={false}
        />
      </div>

      <DashboardUsdcLedgerDialog
        open={ledgerDialogOpen}
        onOpenChange={setLedgerDialogOpen}
      />
    </section>
  );
}
