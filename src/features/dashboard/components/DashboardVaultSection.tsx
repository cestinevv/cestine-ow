import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { VaultStatsResponse } from '@/api/__generated__/wallet/model/vaultStatsResponse';
import {
  useActorVaultRanking,
  useActorVaultStats,
} from '@/api/__generated__/wallet/platform-dashboard-controller/platform-dashboard-controller';
import { DEFAULT_PAGE_SIZE } from '@/constants';
import { unwrapOrvalPayload } from '@/features/mining/miningFormat';
import { cn, formatNumber } from '@/utils';
import {
  formatDashboardUsdAmount,
  mergeDashboardVaultRankingPages,
} from '../utils/dashboardFormat';
import { DashboardPreviewSectionHeader } from './DashboardPreviewSectionHeader';
import { DashboardSectionTitle } from './DashboardSectionTitle';
import { DashboardVaultRankingDialog } from './DashboardVaultRankingDialog';
import { DashboardVaultRankingTable } from './DashboardVaultRankingTable';

function VaultStatCard({ label, value }: { label: string; value: string }) {
  return (
    <article
      className={cn(
        'flex min-w-0 flex-1 flex-col gap-1 p-4 md:gap-2 md:p-8',
        'rounded-xl border border-white bg-card md:rounded-2xl md:border-0',
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

export function DashboardVaultSection() {
  const { t } = useTranslation();
  const [rankingDialogOpen, setRankingDialogOpen] = useState(false);

  const vaultStatsQuery = useActorVaultStats({
    query: { retry: false },
  });

  const rankingQuery = useActorVaultRanking(
    { pageSize: DEFAULT_PAGE_SIZE, mark: 0 },
    { query: { retry: false } },
  );

  const vaultStats = unwrapOrvalPayload<VaultStatsResponse>(
    vaultStatsQuery.data,
  );
  const previewRows = mergeDashboardVaultRankingPages(
    rankingQuery.data ? [rankingQuery.data] : undefined,
  );

  // 打开角色 IP 金库排行弹窗。
  const handleOpenRankingDialog = () => {
    setRankingDialogOpen(true);
  };

  return (
    <section className="flex flex-col gap-4 md:gap-8">
      <DashboardSectionTitle title={t('金库资金沉淀')} />

      <div className="flex flex-row gap-2 md:gap-3">
        <VaultStatCard
          label={t('总资金')}
          value={formatDashboardUsdAmount(vaultStats?.totalVault)}
        />
        <VaultStatCard
          label={t('覆盖角色 IP')}
          value={
            vaultStats?.actorCount === undefined
              ? '-'
              : formatNumber(vaultStats.actorCount, 0)
          }
        />
      </div>

      <div
        className={cn(
          'flex flex-col gap-4 p-4 md:gap-6 md:p-8',
          'rounded-2xl border border-white bg-card md:border-0',
        )}
      >
        <DashboardPreviewSectionHeader
          title={t('角色 IP 金库排行')}
          actionLabel={t('查看更多')}
          onAction={handleOpenRankingDialog}
        />
        <DashboardVaultRankingTable
          rows={previewRows}
          isLoading={rankingQuery.isPending}
          isError={false}
        />
      </div>

      <DashboardVaultRankingDialog
        open={rankingDialogOpen}
        onOpenChange={setRankingDialogOpen}
      />
    </section>
  );
}
