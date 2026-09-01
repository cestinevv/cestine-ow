import { useNavigate } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useGetWeeklyStats } from '@/api/__generated__/mining/mining/mining';
import type { WeeklyStatsDTO } from '@/api/__generated__/mining/model/weeklyStatsDTO';
import IconHelpCircle from '@/assets/svg/IconHelpCircle';
import { Button } from '@/components/ui/button';
import { MiningRulesDialog } from '@/features/mining/components/MiningRulesDialog';
import { unwrapOrvalPayload } from '@/features/mining/miningFormat';
import useGlobalStore from '@/stores/global';
import { cn, formatNumber } from '@/utils';

import {
  GameWeeklyStatHelpDialog,
  type GameWeeklyStatHelpType,
} from './GameWeeklyStatHelpDialog';

const WEEKLY_STAT_ITEMS = [
  {
    labelKey: '本周奖池 (STORY)',
    field: 'weekPool',
    helpType: 'weekPool',
  },
  {
    labelKey: '本周名义产出 (STORY)',
    field: 'weeklyNominalOutput',
    helpType: 'nominalOutput',
  },
  {
    labelKey: '本周预估产出 (STORY)',
    field: 'weeklyTotalOutput',
    helpType: 'actualOutput',
  },
] as const satisfies ReadonlyArray<{
  labelKey: string;
  field: keyof WeeklyStatsDTO;
  helpType: GameWeeklyStatHelpType;
}>;

export function GameWeeklyStatsSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isLogin = useGlobalStore((state) => state.isLogin);
  const [helpType, setHelpType] = useState<GameWeeklyStatHelpType | null>(null);
  const [isRulesOpen, setIsRulesOpen] = useState(false);

  const {
    data: weeklyStatsResponse,
    isPending,
    isError,
  } = useGetWeeklyStats({
    query: {
      enabled: isLogin,
      retry: false,
    },
  });

  const weeklyStats = useMemo(
    () => unwrapOrvalPayload<WeeklyStatsDTO>(weeklyStatsResponse),
    [weeklyStatsResponse],
  );

  const statRows = useMemo(
    () =>
      WEEKLY_STAT_ITEMS.map((item) => {
        const hasValue =
          !isPending && !isError && weeklyStats?.[item.field] !== undefined;

        return {
          labelKey: item.labelKey,
          helpType: item.helpType,
          value: hasValue
            ? formatNumber(weeklyStats[item.field], 2)
            : undefined,
        };
      }),
    [isError, isPending, weeklyStats],
  );

  const handleOpenHelp = (type: GameWeeklyStatHelpType) => {
    setHelpType(type);
  };

  const handleHelpOpenChange = (open: boolean) => {
    if (!open) {
      setHelpType(null);
    }
  };

  const handleOpenRules = () => {
    setIsRulesOpen(true);
  };

  const handleRulesOpenChange = (open: boolean) => {
    setIsRulesOpen(open);
  };

  const handleOpenSettlementRecords = () => {
    void navigate({ to: '/income' });
  };

  return (
    <section aria-labelledby="game-weekly-stats-heading">
      <h2 id="game-weekly-stats-heading" className="sr-only">
        {t('本周奖池 (STORY)')}
      </h2>
      <article
        className={cn(
          'flex w-full flex-col gap-6 rounded-3xl bg-card px-6 py-6',
          'md:flex-row md:items-center md:justify-between md:gap-8 md:px-8 md:py-8',
          'max-md:gap-3 max-md:rounded-xl max-md:p-4',
        )}
      >
        {statRows.map((row) => (
          <div
            key={row.labelKey}
            className={cn(
              'flex min-w-0 flex-1 flex-col gap-1.5',
              'max-md:w-full max-md:flex-none max-md:flex-row max-md:items-center max-md:justify-between max-md:gap-0',
            )}
          >
            <div className="flex items-center gap-2 opacity-90">
              <span
                className={cn(
                  'text-[13px] leading-[18px] text-onestory-brand-red',
                  'max-md:text-muted-foreground',
                )}
              >
                {t(row.labelKey)}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn(
                  'size-4 shrink-0 rounded-full p-0',
                  'text-onestory-brand-red',
                  'hover:bg-transparent hover:text-onestory-brand-red',
                  'active:bg-transparent active:text-onestory-brand-red',
                  'max-md:hidden',
                )}
                aria-label={t('查看{{title}}说明', {
                  title: t(row.labelKey),
                })}
                onClick={() => handleOpenHelp(row.helpType)}
              >
                <IconHelpCircle className="size-4" aria-hidden />
              </Button>
            </div>
            <p
              className={cn(
                'text-[32px] leading-none font-bold tracking-[-0.12px] text-foreground md:text-[40px]',
                'max-md:text-base max-md:leading-6 max-md:tracking-normal',
              )}
            >
              {row.value ?? '-'}
            </p>
          </div>
        ))}

        <div
          className={cn(
            'flex shrink-0 flex-col justify-center gap-1.5',
            'max-md:w-full max-md:flex-row max-md:gap-3',
          )}
        >
          <Button
            type="button"
            variant="outline"
            onClick={handleOpenRules}
            className={cn(
              'h-11 w-full rounded-full px-6',
              'text-sm leading-5 font-bold text-foreground',
              'max-md:flex-1',
            )}
          >
            {t('挖矿规则')}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleOpenSettlementRecords}
            className={cn(
              'h-11 w-full rounded-full px-6',
              'text-sm leading-5 font-bold text-foreground',
              'max-md:flex-1',
            )}
          >
            {t('每周结算记录')}
          </Button>
        </div>
      </article>

      <GameWeeklyStatHelpDialog
        open={helpType !== null}
        onOpenChange={handleHelpOpenChange}
        helpType={helpType}
        weeklyStats={weeklyStats ?? undefined}
      />

      <MiningRulesDialog
        open={isRulesOpen}
        onOpenChange={handleRulesOpenChange}
      />
    </section>
  );
}
