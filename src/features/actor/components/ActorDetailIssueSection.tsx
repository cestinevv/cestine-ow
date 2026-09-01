import Decimal from 'decimal.js';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { ActorCollectionResponse } from '@/api/__generated__/story/model/actorCollectionResponse';
import type { ActorNftVaultDepositResponse } from '@/api/__generated__/wallet/model/actorNftVaultDepositResponse';
import { useVaultDeposit } from '@/api/__generated__/wallet/userwallet-actornft/userwallet-actornft';
import IconHelpCircle from '@/assets/svg/IconHelpCircle';
import { Button } from '@/components/ui/button';
import {
  formatActorNftTokenStandard,
  formatActorPriceCeilDisplay,
  formatActorTailPriceDisplay,
  getActorPlazaCardDisplay,
  unwrapOrvalPayload,
} from '@/features/actor/actorFormat';
import {
  ACTOR_BONDING_CURVE_BASE,
  getActorBondingCurvePrice,
  getActorBondingCurveTailPrice,
  isFixedActorPricingMode,
} from '@/features/actor/actorPricing';
import { ActorIpVaultDialog } from '@/features/actor/components/ActorIpVaultDialog';
import { ActorPriceCurveChart } from '@/features/actor/components/ActorPriceDialog';
import { cn, formatNumber } from '@/utils';
import { readSnowflakeId } from '@/utils/snowflakeId';

type ActorDetailIssueSectionProps = {
  detail: ActorCollectionResponse;
};

type ActorIssueExtras = {
  contractAddress?: string;
};

function shortenAddress(value: string | undefined) {
  const text = value?.trim();
  if (!text) {
    return '0x7A2b...3fD8';
  }
  if (text.length <= 12) {
    return text;
  }
  return `${text.slice(0, 6)}...${text.slice(-4)}`;
}

function ActorIssueInfoCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-2xl bg-muted p-5 md:p-8">
      <span className="text-sm leading-5 tracking-[0.04px] text-muted-foreground">
        {label}
      </span>
      <strong className="truncate text-2xl leading-[30px] font-bold tracking-[-0.07px] text-foreground">
        {value}
      </strong>
    </div>
  );
}

function ActorIssueInfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs leading-4 tracking-[0.04px] text-muted-foreground">
        {label}
      </span>
      <strong className="min-w-0 truncate text-right text-xs leading-4 font-medium tracking-[0.04px] text-foreground">
        {value}
      </strong>
    </div>
  );
}

function formatVaultAmountDisplay(vaultAmount: string | undefined) {
  const text = vaultAmount?.trim();
  if (!text) {
    return undefined;
  }

  try {
    const amount = new Decimal(text);
    if (!amount.isFinite()) {
      return undefined;
    }
    if (amount.lessThan(0.01)) {
      return '0';
    }
    return amount.toDecimalPlaces(2, Decimal.ROUND_DOWN).toFixed(2);
  } catch {
    return undefined;
  }
}

function ActorVaultLegendItem({
  dotClassName,
  label,
}: {
  dotClassName: string;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap">
      <span
        className={cn('size-1.5 rounded-full md:size-[9px]', dotClassName)}
      />
      <span>
        <span>{label} </span>
        <strong className="font-bold text-foreground">30%</strong>
      </span>
    </span>
  );
}

export function ActorDetailIssueSection({
  detail,
}: ActorDetailIssueSectionProps) {
  const { t } = useTranslation();
  const [vaultHelpOpen, setVaultHelpOpen] = useState(false);

  const record = detail as ActorCollectionResponse & ActorIssueExtras;
  const actorCollectionId = readSnowflakeId(detail.id);
  const { data: vaultDepositResponse, isPending: isVaultDepositPending } =
    useVaultDeposit(
      {
        actorCollectionId: (actorCollectionId ?? '0') as unknown as number,
      },
      {
        query: {
          enabled: actorCollectionId !== undefined,
          retry: false,
        },
      },
    );
  const display = getActorPlazaCardDisplay(detail);
  const maxSupply = display.totalSupply;
  const initialPrice = display.initialPriceUsdc;
  const signedCount = display.minted;
  const currentPrice =
    display.currentPriceUsdc ||
    getActorBondingCurvePrice(initialPrice, signedCount, maxSupply);
  const isFixedPricing = isFixedActorPricingMode(display.pricingMode);
  const tokenStandard = formatActorNftTokenStandard(detail.nftTokenStandard);
  const contractAddress = shortenAddress(
    record.contractAddress?.trim() || detail.nftMintAddress?.trim(),
  );
  const formattedMaxSupply = formatNumber(maxSupply, 0);
  const formattedSignedCount = formatNumber(signedCount, 0);
  const formattedInitialPrice = formatNumber(initialPrice, 2);
  const formattedCurrentPrice = formatActorPriceCeilDisplay(currentPrice);
  const formattedTailPrice = formatActorTailPriceDisplay(
    getActorBondingCurveTailPrice(initialPrice, maxSupply),
  );
  const formattedAvailableSupply = formatNumber(display.availableMint, 0);
  const vaultDeposit =
    unwrapOrvalPayload<ActorNftVaultDepositResponse>(vaultDepositResponse);
  const vaultAmount = formatVaultAmountDisplay(vaultDeposit?.vaultAmount);
  const formattedVaultAmount =
    isVaultDepositPending || vaultAmount === undefined ? '--' : vaultAmount;
  const issueInfoItems = [
    { label: t('合约地址'), value: contractAddress },
    { label: t('Token 标准'), value: tokenStandard },
    { label: t('定价类型'), value: t(display.pricingModeLabel) },
    { label: t('总发行量'), value: formattedMaxSupply },
    { label: t('已签约'), value: formattedSignedCount },
    { label: t('剩余'), value: formattedAvailableSupply },
  ];

  const handleVaultHelpClick = () => {
    setVaultHelpOpen(true);
  };

  return (
    <>
      <section className="flex w-full flex-col gap-3 md:gap-4">
        <h2
          className={cn(
            'text-base leading-6 font-bold text-foreground',
            'md:text-lg md:leading-[26px] md:tracking-[-0.04px]',
          )}
        >
          {t('发行信息')}
        </h2>

        <div className="flex flex-col gap-6 rounded-xl bg-card p-4 md:gap-3 md:rounded-2xl md:p-8">
          <div className="flex flex-col gap-2 md:hidden">
            {issueInfoItems.map((item) => (
              <ActorIssueInfoRow
                key={item.label}
                label={item.label}
                value={item.value}
              />
            ))}
          </div>

          <div className="hidden gap-3 md:grid md:grid-cols-3">
            {issueInfoItems.map((item) => (
              <ActorIssueInfoCard
                key={item.label}
                label={item.label}
                value={item.value}
              />
            ))}
          </div>

          {!isFixedPricing ? (
            <div
              className={cn(
                'flex flex-col gap-3',
                // Figma Page&Sheet/secondary：浅 #f0f0f3 / 深 #212225
                'md:rounded-2xl md:bg-muted md:p-4',
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <h3
                    className={cn(
                      'text-sm leading-5 font-medium text-foreground',
                      'md:text-base md:leading-6 md:font-bold',
                    )}
                  >
                    {t('价格联合曲线')}
                  </h3>
                  <p className="hidden text-sm leading-5 text-actor-issue-formula md:block">
                    {t(
                      '公式：价格 = 初始价格 × {{base}}^(已签约数 ÷ 发行总量)',
                      {
                        base: ACTOR_BONDING_CURVE_BASE,
                      },
                    )}
                  </p>
                </div>
                <div
                  className={cn(
                    'flex shrink-0 items-center gap-4 text-xs leading-4 text-muted-foreground',
                    'md:gap-11 md:text-sm md:leading-5',
                  )}
                >
                  <span className="inline-flex items-center gap-1">
                    <span className="size-[9px] rounded-full bg-actor-curve-accent" />
                    {t('价格曲线')}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="size-[9px] rounded-full bg-onestory-brand-red" />
                    {t('当前位置')}
                  </span>
                </div>
              </div>

              <p className="w-full text-sm leading-5 text-actor-issue-formula md:hidden">
                {t('公式：价格 = 初始价格 × {{base}}^(已签约数 ÷ 发行总量)', {
                  base: ACTOR_BONDING_CURVE_BASE,
                })}
              </p>

              <div className="rounded-xl bg-onestory-brand-red/5 p-3 md:bg-transparent md:p-0">
                <ActorPriceCurveChart
                  signedCount={signedCount}
                  maxSupply={maxSupply}
                  initialPrice={initialPrice}
                  currentPrice={currentPrice}
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: t('初始价格'), value: formattedInitialPrice },
                  { label: t('当前价格'), value: formattedCurrentPrice },
                  { label: t('尾价'), value: formattedTailPrice },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex min-w-0 flex-col items-center gap-0.5 rounded-xl border border-border px-2 py-3"
                  >
                    <span className="text-[10px] leading-3 text-muted-foreground">
                      {item.label}
                    </span>
                    <strong className="truncate text-sm leading-5 font-medium text-foreground">
                      {item.value} USDC
                    </strong>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex flex-col items-start gap-3 rounded-2xl md:items-center md:bg-muted md:p-4">
            <div className="flex w-full items-center">
              <div className="flex min-w-0 flex-1 items-center gap-1">
                <h3 className="text-sm leading-5 font-medium text-foreground md:text-base md:leading-6 md:font-bold">
                  {t('角色 IP 金库')}
                </h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t('查看角色 IP 金库说明')}
                  onClick={handleVaultHelpClick}
                  className="size-6 rounded-full p-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
                >
                  <IconHelpCircle className="size-4" />
                </Button>
              </div>
            </div>
            <div className="flex h-[58px] w-full items-center justify-start rounded-xl bg-onestory-brand-red/5 p-4 md:h-auto md:justify-center">
              <strong className="text-left text-lg leading-[26px] font-bold tracking-[-0.04px] text-onestory-brand-red md:text-center">
                {formattedVaultAmount} USDC
              </strong>
            </div>
            <div className="flex flex-col items-start justify-center gap-2 text-sm leading-5 text-muted-foreground md:flex-row md:items-center md:gap-11">
              <ActorVaultLegendItem
                dotClassName="bg-actor-curve-accent"
                label={t('签约收入 · 沉淀')}
              />
              <ActorVaultLegendItem
                dotClassName="bg-onestory-brand-red"
                label={t('二级版税 · 沉淀')}
              />
            </div>
          </div>
        </div>
      </section>
      <ActorIpVaultDialog
        open={vaultHelpOpen}
        onOpenChange={setVaultHelpOpen}
      />
    </>
  );
}
