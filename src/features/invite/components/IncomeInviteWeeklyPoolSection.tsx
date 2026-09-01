import { useTranslation } from 'react-i18next';

import { cn, formatNumber } from '@/utils';

type IncomeInviteWeeklyPoolSectionProps = {
  weeklyPoolAmount?: string;
};

function formatPoolAmount(value?: string) {
  if (value === undefined || value.trim() === '') {
    return '-';
  }

  return formatNumber(value, 0);
}

export function IncomeInviteWeeklyPoolSection({
  weeklyPoolAmount,
}: IncomeInviteWeeklyPoolSectionProps) {
  const { t } = useTranslation();

  return (
    <article
      className={cn(
        'flex w-full flex-col gap-6 rounded-2xl bg-card p-4',
        'md:p-5',
      )}
    >
      <h1 className="hidden text-3xl leading-9 font-bold tracking-[-0.12px] text-foreground md:block">
        {t('邀请好友，赚取STORY')}
      </h1>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="text-[13px] leading-[18px] font-normal text-wallet-text-secondary opacity-90">
          {t('本周邀请奖池')}
        </p>
        <div className="flex flex-wrap items-baseline gap-2 text-language-switcher-active">
          <span
            className={cn(
              'font-bold tracking-[-0.12px]',
              'text-[26px] leading-[26px]',
              'md:text-5xl md:leading-[58px]',
            )}
          >
            {formatPoolAmount(weeklyPoolAmount)}
          </span>
          <span className="text-[13px] leading-[18px] font-medium text-wallet-text-tertiary">
            STORY
          </span>
        </div>
      </div>
    </article>
  );
}
