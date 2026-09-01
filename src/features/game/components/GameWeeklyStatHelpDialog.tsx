import { useTranslation } from 'react-i18next';

import type { WeeklyStatsDTO } from '@/api/__generated__/mining/model/weeklyStatsDTO';
import { AppDialog } from '@/components/common/AppDialog';
import { APP_DIALOG_SECONDARY_FULL_WIDTH_BUTTON_CLASS } from '@/components/common/appDialogButton';
import { Button } from '@/components/ui/button';
import { cn, formatNumber } from '@/utils';

export type GameWeeklyStatHelpType =
  | 'weekPool'
  | 'nominalOutput'
  | 'actualOutput';

type GameWeeklyStatHelpDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  helpType: GameWeeklyStatHelpType | null;
  weeklyStats?: WeeklyStatsDTO;
};

/** Figma 637:73882 — 周衰减系数常量 */
const WEEK_DECAY_FACTOR = '0.99572';

const HELP_PANEL_CLASS = cn('rounded-xl bg-muted px-4 py-3');

function HelpDetailRow({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-4 py-2',
        'text-xs leading-4 tracking-[0.04px]',
        className,
      )}
    >
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 flex-1 text-right font-medium text-foreground">
        {value}
      </span>
    </div>
  );
}

function DetailRows({
  rows,
}: {
  rows: Array<{ label: string; value: string }>;
}) {
  return (
    <div className={HELP_PANEL_CLASS}>
      <div className="divide-y divide-border">
        {rows.map((row) => (
          <HelpDetailRow key={row.label} label={row.label} value={row.value} />
        ))}
      </div>
    </div>
  );
}

function formatStoryAmount(value: number | undefined): string {
  return value === undefined || !Number.isFinite(value)
    ? '-'
    : formatNumber(value, 0);
}

function WeekPoolSplitCard({
  label,
  amount,
}: {
  label: string;
  amount: string;
}) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-1 flex-col items-start overflow-hidden',
        'rounded-xl border-[0.5px] border-border bg-background',
        'px-4 py-3',
      )}
    >
      <p className="m-0 text-xs leading-4 tracking-[0.04px] text-muted-foreground opacity-90">
        {label}
      </p>
      <p className="m-0 text-base leading-6 font-bold tracking-normal text-foreground">
        {amount}{' '}
        <span className="text-xs leading-4 font-normal tracking-[0.04px] text-muted-foreground">
          STORY
        </span>
      </p>
    </div>
  );
}

function WeekPoolHelpBody({ weeklyStats }: { weeklyStats?: WeeklyStatsDTO }) {
  const { t } = useTranslation();

  // 演出奖池 = 总奖池 − 邀请奖池（75% / 25%）
  const performancePool =
    weeklyStats?.weekPool !== undefined &&
    weeklyStats.weekInvitePool !== undefined
      ? weeklyStats.weekPool - weeklyStats.weekInvitePool
      : undefined;

  return (
    <div className="flex w-full flex-col gap-3">
      {/* Figma 637:72723 — 本周总奖池红底卡 */}
      <div
        className={cn(
          'flex w-full flex-col items-start justify-center gap-3',
          'rounded-xl bg-game-actor-rate-highlight-surface p-3',
        )}
      >
        <div className="flex w-full flex-col items-start">
          <p className="m-0 w-full text-xs leading-4 font-bold tracking-[0.04px] text-muted-foreground">
            {t('本周总奖池')}
          </p>
          <p className="m-0 w-full text-lg leading-[26px] font-bold tracking-[-0.04px] text-game-actor-rate-highlight">
            {formatStoryAmount(weeklyStats?.weekPool)} STORY
          </p>
        </div>
        <p className="m-0 w-full text-[10px] leading-3 tracking-[0.08px] text-muted-foreground">
          {t('周衰减系数')} ×{WEEK_DECAY_FACTOR}
        </p>
      </div>

      <div className="flex w-full gap-3">
        <WeekPoolSplitCard
          label={t('演出奖池（75%）')}
          amount={formatStoryAmount(performancePool)}
        />
        <WeekPoolSplitCard
          label={t('邀请奖池（25%）')}
          amount={formatStoryAmount(weeklyStats?.weekInvitePool)}
        />
      </div>

      {/* Figma 637:72750 — 分配规则 */}
      <div className="w-full rounded-xl bg-game-upgrade-compare-surface p-3">
        <div className="text-sm leading-5 tracking-normal text-foreground">
          <p className="m-0 font-bold">{t('分配规则')}</p>
          <p className="m-0">&nbsp;</p>
          <p className="m-0">
            <span className="font-bold">{t('全网名义产出 ≤ 当周硬顶：')}</span>
            <br />
            <span className="text-muted-foreground">
              {t('用户实得 = 用户名义产出')}
            </span>
          </p>
          <p className="m-0">&nbsp;</p>
          <p className="m-0">
            <span className="font-bold">{t('全网名义产出 > 当周硬顶：')}</span>
            <br />
            <span className="text-muted-foreground">
              {t('用户实得 = 用户名义产出 ×（当周硬顶 ÷ 全网名义产出）')}
            </span>
          </p>
          <p className="m-0">&nbsp;</p>
          <p className="m-0">
            <span className="font-bold">{t('单地址周封顶：')}</span>
            <br />
            <span className="text-muted-foreground">
              {t('单个地址每周最多领取当周硬顶的 5%')}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

function NominalOutputHelpBody() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-3">
      <div className={cn(HELP_PANEL_CLASS, 'rounded-lg py-3 text-center')}>
        <p className="text-sm leading-5 font-bold text-foreground">
          {t('我的所有角色的周累计名义产出累加')}
        </p>
        <p className="text-[10px] leading-3 tracking-[0.08px] text-muted-foreground">
          {t('单卡公式见下方说明')}
        </p>
      </div>

      <p className="text-[13px] leading-[18px] text-foreground">
        {t('单卡名义产出 = 单卡小时权重 × R_base × 有效挖矿时长')}
      </p>

      <DetailRows
        rows={[
          {
            label: t('单卡小时权重'),
            value: t('= 角色片酬'),
          },
          {
            label: t('角色片酬'),
            value: t('角色片酬 = IP片酬 × 片酬系数 × CP系数 × Trust2'),
          },
          {
            label: 'R_base',
            value: t('1 STORY / 单位权重 / 小时'),
          },
          {
            label: t('有效挖矿时长'),
            value: t('质押中且体力 > 0 的累计时长'),
          },
        ]}
      />
    </div>
  );
}

function ActualOutputHelpBody() {
  const { t } = useTranslation();

  return (
    <div className={cn(HELP_PANEL_CLASS, 'border border-border')}>
      <div className="divide-y divide-border">
        <div className="flex flex-col gap-2 py-2 text-[13px] leading-[18px]">
          <p className="text-muted-foreground">
            {t('若全网名义产出 ≤ 当周硬顶：')}
          </p>
          <div className="flex flex-col gap-1">
            <p className="font-medium text-foreground">
              {t('用户实得 = 用户名义产出')}
            </p>
            <p className="text-muted-foreground">
              {t('未发出的剩余额度不发放、不回流、不补分')}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 py-2 text-[13px] leading-[18px]">
          <p className="text-muted-foreground">
            {t('若全网名义产出 > 当周硬顶：')}
          </p>
          <p className="font-medium text-foreground">
            {t('用户实得 = 用户名义产出 × 当周硬顶 / 全网名义产出')}
          </p>
        </div>

        <div className="flex flex-col gap-2 py-2 text-[13px] leading-[18px]">
          <p className="text-muted-foreground">{t('单地址周封顶')}</p>
          <p className="font-medium text-foreground">
            {t('单个地址每周最多领取当周硬顶的 5%')}
          </p>
        </div>
      </div>
    </div>
  );
}

const HELP_DIALOG_META: Record<
  GameWeeklyStatHelpType,
  { titleKey: string; subtitleKey?: string }
> = {
  weekPool: {
    titleKey: '片酬与奖池',
  },
  nominalOutput: {
    titleKey: '本周名义产出',
  },
  actualOutput: {
    titleKey: '本周预估产出',
    subtitleKey: '预估产出受周硬顶和单地址封顶约束，本周结束时产生实际收益',
  },
};

export function GameWeeklyStatHelpDialog({
  open,
  onOpenChange,
  helpType,
  weeklyStats,
}: GameWeeklyStatHelpDialogProps) {
  const { t } = useTranslation();

  if (!helpType) {
    return null;
  }

  const meta = HELP_DIALOG_META[helpType];

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t(meta.titleKey)}
      hideHeader
      width={343}
      bodyScroll={false}
      bodyClassName="p-4"
    >
      {/* Figma 637:73882 — gap-24 / p-16 */}
      <div className="flex w-full flex-col items-center gap-6">
        <header className="flex w-full shrink-0 flex-col items-center gap-1 text-center">
          <h2 className="m-0 w-full text-lg leading-[26px] font-bold tracking-[-0.04px] text-foreground">
            {t(meta.titleKey)}
          </h2>
          {meta.subtitleKey ? (
            <p className="text-xs leading-4 font-normal tracking-[0.04px] text-muted-foreground">
              {t(meta.subtitleKey)}
            </p>
          ) : null}
        </header>

        {helpType === 'weekPool' ? (
          <WeekPoolHelpBody weeklyStats={weeklyStats} />
        ) : null}
        {helpType === 'nominalOutput' ? <NominalOutputHelpBody /> : null}
        {helpType === 'actualOutput' ? <ActualOutputHelpBody /> : null}

        <Button
          type="button"
          variant="outline"
          className={APP_DIALOG_SECONDARY_FULL_WIDTH_BUTTON_CLASS}
          onClick={handleClose}
        >
          {t('关闭')}
        </Button>
      </div>
    </AppDialog>
  );
}
