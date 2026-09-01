import { useTranslation } from 'react-i18next';

import type { IncomeWalletEarningsBadgeVariant } from '@/features/income/incomeWalletEarningsFormat';
import { cn } from '@/utils';

type IncomeWalletEarningsTypeBadgeProps = {
  labelKey: string;
  variant: IncomeWalletEarningsBadgeVariant;
};

const BADGE_VARIANT_CLASS: Record<IncomeWalletEarningsBadgeVariant, string> = {
  dispatch: 'bg-language-switcher-active-bg text-language-switcher-active',
  invite: 'bg-income-invite-badge-bg text-income-invite-badge-text',
  'actor-sign':
    'bg-game-my-actor-deploy-surface text-game-my-actor-deploy-text',
};

export function IncomeWalletEarningsTypeBadge({
  labelKey,
  variant,
}: IncomeWalletEarningsTypeBadgeProps) {
  const { t } = useTranslation();

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-[17px] px-2 py-0.5',
        'text-sm leading-5 font-normal',
        BADGE_VARIANT_CLASS[variant],
      )}
    >
      {t(labelKey)}
    </span>
  );
}
