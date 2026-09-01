import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import {
  IncomeWalletEarningsHelpDialog,
  IncomeWalletEarningsHelpLabel,
} from '@/features/income/components/wallet-earnings/IncomeWalletEarningsHelpDialog';
import { IncomeWalletEarningsHelpType } from '@/features/income/incomeWalletEarningsFormat';
import { cn, formatNumber, toNumber } from '@/utils';

type IncomeWalletEarningsSummarySectionProps = {
  totalStoryEarnings?: string;
  totalUsdcEarnings?: string;
  settlingStoryEarnings?: string;
  claimableStory?: string;
  claimableUsdc?: string;
  onClaimStory: () => void;
  onClaimUsdc: () => void;
};

export function IncomeWalletEarningsSummarySection({
  totalStoryEarnings,
  totalUsdcEarnings,
  settlingStoryEarnings,
  claimableStory,
  claimableUsdc,
  onClaimStory,
  onClaimUsdc,
}: IncomeWalletEarningsSummarySectionProps) {
  const { t } = useTranslation();
  const [helpType, setHelpType] = useState<IncomeWalletEarningsHelpType | null>(
    null,
  );
  const isStoryClaimDisabled = toNumber(claimableStory ?? '0') <= 0;
  const isUsdcClaimDisabled = toNumber(claimableUsdc ?? '0') <= 0;

  // 结算中为 0 时不展示「到账后可领取」说明
  const showSettlingHint = toNumber(settlingStoryEarnings ?? '0') > 0;

  const desktopValueClassName = cn(
    'font-bold text-foreground',
    'text-[40px] leading-none tracking-[-0.12px]',
  );

  const mobileValueClassName = cn(
    'font-bold text-foreground',
    'text-base leading-6',
  );

  const desktopHintClassName =
    'text-[13px] leading-[18px] text-wallet-text-tertiary';

  const mobileHintClassName =
    'text-xs leading-4 tracking-[0.04px] text-wallet-text-tertiary';

  const claimButtonClassName = cn(
    // Layout & Positioning
    'shrink-0',
    // Sizing & Spacing
    'h-10 px-6 py-2.5',
    // Visuals & Typography — Figma 970:112165 primary/15% red + #e50815
    'rounded-full text-sm leading-5 font-bold',
    'bg-destructive/15 text-destructive',
    // Interactions & States — Figma 970:112176 unavailable + tertiary
    'hover:bg-destructive/20 hover:text-destructive',
    'disabled:bg-button-disabled-surface disabled:text-wallet-text-tertiary',
    'disabled:hover:bg-button-disabled-surface disabled:hover:text-wallet-text-tertiary',
  );

  const desktopCardClassName = cn(
    // Layout & Positioning
    'flex min-w-0 flex-1 flex-col items-start',
    // Sizing & Spacing
    'p-8',
    // Visuals & Typography
    'rounded-3xl bg-card',
  );

  const handleOpenHelp = (type: IncomeWalletEarningsHelpType) => {
    setHelpType(type);
  };

  const handleHelpOpenChange = (open: boolean) => {
    if (!open) {
      setHelpType(null);
    }
  };

  return (
    <div className="w-full">
      {/* 桌面：两行卡片 — 累计 / 结算中+可领取（Figma 970:113010） */}
      <section className="hidden w-full flex-col gap-3 md:flex">
        <div className="flex w-full gap-3">
          <article
            className={cn(desktopCardClassName, 'h-[136px] justify-center')}
          >
            <div className="flex w-full flex-col gap-1.5">
              <IncomeWalletEarningsHelpLabel
                helpType={IncomeWalletEarningsHelpType.TotalStory}
                onOpen={handleOpenHelp}
                className="opacity-90"
              />
              <p className={desktopValueClassName}>
                {totalStoryEarnings !== undefined
                  ? formatNumber(totalStoryEarnings, 2)
                  : '-'}
              </p>
            </div>
          </article>

          <article
            className={cn(desktopCardClassName, 'h-[136px] justify-center')}
          >
            <div className="flex w-full flex-col gap-1.5">
              <IncomeWalletEarningsHelpLabel
                helpType={IncomeWalletEarningsHelpType.TotalUsdc}
                onOpen={handleOpenHelp}
                className="opacity-90"
              />
              <p className={desktopValueClassName}>
                {totalUsdcEarnings !== undefined
                  ? formatNumber(totalUsdcEarnings, 2)
                  : '-'}
              </p>
            </div>
          </article>
        </div>

        <div className="flex w-full gap-3">
          <article className={desktopCardClassName}>
            <div className="flex w-full flex-col gap-1.5">
              <IncomeWalletEarningsHelpLabel
                helpType={IncomeWalletEarningsHelpType.SettlingStory}
                onOpen={handleOpenHelp}
                className="opacity-90"
              />
              <p className={desktopValueClassName}>
                {settlingStoryEarnings !== undefined
                  ? formatNumber(settlingStoryEarnings, 2)
                  : '-'}
              </p>
              {showSettlingHint ? (
                <p className={desktopHintClassName}>
                  {t('结算中，到账后可领取')}
                </p>
              ) : null}
            </div>
          </article>

          <article className={cn(desktopCardClassName, 'self-stretch')}>
            <div className="flex w-full items-start justify-between gap-6 pr-6">
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <IncomeWalletEarningsHelpLabel
                  helpType={IncomeWalletEarningsHelpType.ClaimableStory}
                  onOpen={handleOpenHelp}
                  className="opacity-90"
                />
                <p className={desktopValueClassName}>
                  {claimableStory !== undefined
                    ? formatNumber(claimableStory, 2)
                    : '-'}
                </p>
              </div>
              <Button
                type="button"
                variant="destructive"
                className={claimButtonClassName}
                disabled={isStoryClaimDisabled}
                onClick={onClaimStory}
              >
                {t('领取')}
              </Button>
            </div>
          </article>

          <article className={cn(desktopCardClassName, 'self-stretch')}>
            <div className="flex w-full items-start justify-between gap-6">
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <IncomeWalletEarningsHelpLabel
                  helpType={IncomeWalletEarningsHelpType.ClaimableUsdc}
                  onOpen={handleOpenHelp}
                  className="opacity-90"
                />
                <p className={desktopValueClassName}>
                  {claimableUsdc !== undefined
                    ? formatNumber(claimableUsdc, 2)
                    : '-'}
                </p>
              </div>
              <Button
                type="button"
                variant="destructive"
                className={claimButtonClassName}
                disabled={isUsdcClaimDisabled}
                onClick={onClaimUsdc}
              >
                {t('领取')}
              </Button>
            </div>
          </article>
        </div>
      </section>

      {/* 移动端：累计并排 + 结算中横排 + 两张可领取卡（Figma 6284:71270） */}
      <section className="flex w-full flex-col gap-3 md:hidden">
        <article className="flex w-full gap-4 rounded-xl bg-card p-4">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <IncomeWalletEarningsHelpLabel
              helpType={IncomeWalletEarningsHelpType.TotalStory}
              onOpen={handleOpenHelp}
              className="opacity-90"
            />
            <p className={mobileValueClassName}>
              {totalStoryEarnings !== undefined
                ? formatNumber(totalStoryEarnings, 2)
                : '-'}
            </p>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <IncomeWalletEarningsHelpLabel
              helpType={IncomeWalletEarningsHelpType.TotalUsdc}
              onOpen={handleOpenHelp}
              className="opacity-90"
            />
            <p className={mobileValueClassName}>
              {totalUsdcEarnings !== undefined
                ? formatNumber(totalUsdcEarnings, 2)
                : '-'}
            </p>
          </div>
        </article>

        <article
          className={cn(
            'flex w-full rounded-xl bg-card p-4',
            showSettlingHint ? 'items-start' : 'items-center',
          )}
        >
          <div className="flex w-full items-start justify-between gap-4">
            <div className="flex min-w-0 flex-1 flex-col gap-1 opacity-90">
              <IncomeWalletEarningsHelpLabel
                helpType={IncomeWalletEarningsHelpType.SettlingStory}
                onOpen={handleOpenHelp}
              />
              {showSettlingHint ? (
                <p className={mobileHintClassName}>
                  {t('结算中，到账后可领取')}
                </p>
              ) : null}
            </div>
            <p className={cn(mobileValueClassName, 'shrink-0 text-right')}>
              {settlingStoryEarnings !== undefined
                ? formatNumber(settlingStoryEarnings, 2)
                : '-'}
            </p>
          </div>
        </article>

        <article className="flex w-full items-center gap-1.5 rounded-xl bg-card p-4">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <IncomeWalletEarningsHelpLabel
              helpType={IncomeWalletEarningsHelpType.ClaimableStory}
              onOpen={handleOpenHelp}
              className="opacity-90"
            />
            <p className={mobileValueClassName}>
              {claimableStory !== undefined
                ? formatNumber(claimableStory, 2)
                : '-'}
            </p>
          </div>
          <Button
            type="button"
            variant="destructive"
            className={claimButtonClassName}
            disabled={isStoryClaimDisabled}
            onClick={onClaimStory}
          >
            {t('领取')}
          </Button>
        </article>

        <article className="flex w-full items-center gap-1.5 rounded-xl bg-card p-4">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <IncomeWalletEarningsHelpLabel
              helpType={IncomeWalletEarningsHelpType.ClaimableUsdc}
              onOpen={handleOpenHelp}
              className="opacity-90"
            />
            <p className={mobileValueClassName}>
              {claimableUsdc !== undefined
                ? formatNumber(claimableUsdc, 2)
                : '-'}
            </p>
          </div>
          <Button
            type="button"
            variant="destructive"
            className={claimButtonClassName}
            disabled={isUsdcClaimDisabled}
            onClick={onClaimUsdc}
          >
            {t('领取')}
          </Button>
        </article>
      </section>

      <IncomeWalletEarningsHelpDialog
        open={helpType !== null}
        onOpenChange={handleHelpOpenChange}
        helpType={helpType}
      />
    </div>
  );
}
