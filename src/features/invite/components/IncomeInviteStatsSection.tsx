import { useTranslation } from 'react-i18next';

import IconMoreArrow from '@/assets/svg/IconMoreArrow';
import { Button } from '@/components/ui/button';
import { cn, formatNumber } from '@/utils';

type IncomeInviteStatsSectionProps = {
  totalInviteCount?: string;
  cumulativeInviteStoryEarnings?: string;
  onInviteCountClick?: () => void;
};

function formatStatValue(value?: string) {
  if (value === undefined || value.trim() === '') {
    return '-';
  }

  return formatNumber(value, value.includes('.') ? 2 : 0);
}

const statLabelClassName = cn(
  'text-[13px] leading-[18px] font-normal text-wallet-text-secondary opacity-90',
);

const statValueClassName = cn(
  'font-bold tracking-[-0.12px] text-foreground',
  'text-base leading-6',
  'md:text-[40px] md:leading-normal',
);

type StatCardProps = {
  label: string;
  value?: string;
  onClick?: () => void;
};

function StatCard({ label, value, onClick }: StatCardProps) {
  const labelContent = (
    <div className="flex items-center gap-2">
      <p className={statLabelClassName}>{label}</p>
      {onClick ? (
        <IconMoreArrow
          aria-hidden
          className="h-3 w-1.5 shrink-0 text-wallet-text-secondary"
        />
      ) : null}
    </div>
  );

  const valueContent = (
    <p className={statValueClassName}>{formatStatValue(value)}</p>
  );

  if (onClick) {
    return (
      <Button
        type="button"
        variant="ghost"
        onClick={onClick}
        className={cn(
          'flex min-w-0 flex-1 flex-col items-start gap-1 rounded-xl bg-card p-4',
          'h-auto justify-start text-left font-normal',
          'hover:bg-card active:bg-card',
          'md:gap-1 md:rounded-3xl md:px-8 md:py-11',
        )}
      >
        {labelContent}
        {valueContent}
      </Button>
    );
  }

  return (
    <article
      className={cn(
        'flex min-w-0 flex-1 flex-col gap-1 rounded-xl bg-card p-4',
        'md:gap-1 md:rounded-3xl md:px-8 md:py-11',
      )}
    >
      {labelContent}
      {valueContent}
    </article>
  );
}

export function IncomeInviteStatsSection({
  totalInviteCount,
  cumulativeInviteStoryEarnings,
  onInviteCountClick,
}: IncomeInviteStatsSectionProps) {
  const { t } = useTranslation();

  return (
    <section className={cn('flex w-full flex-col gap-4 md:mt-3 md:flex-row')}>
      <StatCard
        label={t('累计邀请人数')}
        value={totalInviteCount}
        onClick={onInviteCountClick}
      />
      <StatCard
        label={t('累计邀请收益 STORY')}
        value={cumulativeInviteStoryEarnings}
      />
    </section>
  );
}
