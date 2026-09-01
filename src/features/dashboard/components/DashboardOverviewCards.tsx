import { useTranslation } from 'react-i18next';
import { useTotalReleased } from '@/api/__generated__/mining/mining/mining';
import type { UsdcIncomeStatsResponse } from '@/api/__generated__/wallet/model/usdcIncomeStatsResponse';
import { useGetIncomeStats } from '@/api/__generated__/wallet/platform-dashboard-controller/platform-dashboard-controller';
import { unwrapOrvalPayload } from '@/features/mining/miningFormat';
import { cn, formatNumber } from '@/utils';

function OverviewStatCard({
  label,
  value,
  isLoading,
}: {
  label: string;
  value: string;
  isLoading: boolean;
}) {
  return (
    <article
      className={cn(
        // Layout
        'flex min-w-0 flex-1 flex-col',
        // Spacing
        'gap-1.5 p-4 md:gap-3 md:p-8',
        // Visual
        'rounded-xl border border-white bg-card md:rounded-2xl md:border-0',
      )}
    >
      <p className="text-[13px] leading-[18px] text-muted-foreground md:text-sm md:leading-[18px]">
        {label}
      </p>
      <p
        className={cn(
          'font-bold tracking-[-0.68px] text-foreground',
          'text-base leading-6 md:text-[40px] md:leading-[48px]',
        )}
      >
        {isLoading ? '-' : value}
      </p>
    </article>
  );
}

export function DashboardOverviewCards() {
  const { t } = useTranslation();

  const incomeStatsQuery = useGetIncomeStats({
    query: { retry: false },
  });
  const totalReleasedQuery = useTotalReleased({
    query: { retry: false },
  });

  const incomeStats = unwrapOrvalPayload<UsdcIncomeStatsResponse>(
    incomeStatsQuery.data,
  );
  const totalReleased = unwrapOrvalPayload<number>(totalReleasedQuery.data);

  return (
    <section className="flex flex-row gap-2 md:gap-3">
      <OverviewStatCard
        label={t('USDC 总收入')}
        value={
          incomeStats?.totalAmount === undefined
            ? '-'
            : formatNumber(incomeStats.totalAmount, 2)
        }
        isLoading={incomeStatsQuery.isPending}
      />
      <OverviewStatCard
        label={t('STORY 总释放')}
        value={
          totalReleasedQuery.isSuccess
            ? formatNumber(totalReleased ?? 0, 2)
            : '-'
        }
        isLoading={totalReleasedQuery.isPending}
      />
    </section>
  );
}
