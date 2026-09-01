import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import type { ActorCollectionResponse } from '@/api/__generated__/story/model/actorCollectionResponse';
import IconActorIpBadge from '@/assets/svg/IconActorIpBadge';
import IconHelpCircle from '@/assets/svg/IconHelpCircle';
import {
  APP_DIALOG_PRIMARY_BUTTON_CLASS,
  APP_DIALOG_SECONDARY_BUTTON_CLASS,
} from '@/components/common/appDialogButton';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { formatActorPriceCeilDisplay } from '@/features/actor/actorFormat';
import type { ActorPricingMode } from '@/features/actor/actorPricing';
import { isFixedActorPricingMode } from '@/features/actor/actorPricing';
import {
  buildPlazaActorMiningBreakdown,
  getPlazaActorHourlyRates,
} from '@/features/actor/plazaActorStoryRate';
import { GameActorPowerDialog } from '@/features/game/components/GameActorPowerDialog';
import { useConfigStore } from '@/stores/config';
import { cn, formatNumber } from '@/utils';

import { ActorPriceDialog } from './ActorPriceDialog';

type ActorSignDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actor: ActorCollectionResponse | null;
  actorName: string;
  nftIdLabel?: string;
  nftIdValue?: string;
  imageUrl?: string;
  currentPrice: number;
  mintedSupply: number;
  initialPrice: number;
  totalSupply: number;
  pricingMode: ActorPricingMode;
  pricingModeLabel: string;
  remainingCount: number;
  quantity: number;
  onQuantityChange: (quantity: number) => void;
  onCancel: () => void;
  onConfirm: () => void;
  isPending?: boolean;
  confirmDisabled?: boolean;
};

export function ActorSignDialog({
  open,
  onOpenChange,
  actor,
  actorName,
  nftIdLabel,
  nftIdValue,
  imageUrl,
  currentPrice,
  mintedSupply,
  initialPrice,
  totalSupply,
  pricingMode,
  pricingModeLabel,
  remainingCount,
  onCancel,
  onConfirm,
  isPending = false,
  confirmDisabled = false,
}: ActorSignDialogProps) {
  const { t } = useTranslation();
  const initConfig = useConfigStore((state) => state.initConfig);
  const [priceOpen, setPriceOpen] = useState(false);
  const [payDetailOpen, setPayDetailOpen] = useState(false);

  const safeCurrentPrice = Number.isFinite(currentPrice) ? currentPrice : 0;
  const safeRemainingCount = Number.isFinite(remainingCount)
    ? remainingCount
    : 0;
  const safeTotalSupply = Number.isFinite(totalSupply) ? totalSupply : 0;
  const isFixedPricing = isFixedActorPricingMode(pricingMode);
  const actorIpValue = nftIdValue?.trim() || '';
  // 与广场卡同一口径：Lv.1 每小时片酬 + 片酬详情弹窗分解
  const lv1Rates = actor
    ? getPlazaActorHourlyRates(actor, initConfig ?? undefined)
    : undefined;
  const lv1Breakdown = actor
    ? buildPlazaActorMiningBreakdown(actor, {
        miningCoefficient: lv1Rates?.lv1MiningCoefficient,
        actorPower: lv1Rates?.lv1Rate,
      })
    : undefined;

  const handleCopyActorIp = async () => {
    if (!actorIpValue) {
      return;
    }
    await navigator.clipboard.writeText(actorIpValue);
    toast.success(t('编号已复制'));
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          bodyScroll
          bare
          className={cn(
            'max-h-[90dvh] w-full overflow-y-auto border-0 bg-transparent p-0 shadow-none md:max-w-[500px]',
          )}
        >
          <div className="flex w-full flex-col overflow-hidden rounded-t-2xl bg-background md:rounded-2xl">
            <div className="relative aspect-[400/300] w-full overflow-hidden bg-muted">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt=""
                  className="size-full object-cover"
                  width={500}
                  height={375}
                />
              ) : null}
              <div className="pointer-events-none absolute bottom-4 left-4 flex items-center">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={!actorIpValue}
                  onClick={() => void handleCopyActorIp()}
                  className={cn(
                    'pointer-events-auto h-auto min-w-0 gap-0.5 rounded-full border-transparent',
                    'bg-black/50 py-1 pr-1.5 pl-1 text-xs leading-4 font-medium tracking-[0.04px] text-white',
                    'hover:bg-black/60 hover:text-white',
                    'disabled:opacity-100 disabled:hover:bg-black/50',
                  )}
                >
                  <IconActorIpBadge className="size-4 shrink-0 text-white" />
                  <span className="truncate">{nftIdLabel || t('角色 IP')}</span>
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-4 p-6">
              <header className="flex items-center justify-between gap-4">
                <DialogTitle className="text-lg leading-[26px] font-bold tracking-[-0.04px] text-foreground">
                  {t('确认签约')}
                </DialogTitle>
                {/* 稿面角色名偏次级对比；深色用 muted，避免硬编码 #333 */}
                <h3 className="min-w-0 truncate text-lg leading-[26px] font-bold tracking-[-0.04px] text-muted-foreground">
                  {actorName}
                </h3>
              </header>

              {/* page&sheet/thirdly → muted */}
              <div className="flex flex-col gap-2 rounded-xl bg-muted px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-base leading-6 font-medium text-foreground">
                      {t('签约价格')}
                    </span>
                    <span className="text-xs leading-4 tracking-[0.04px] text-muted-foreground">
                      {t('总发行{{total}} · 剩余{{remaining}}', {
                        total: formatNumber(safeTotalSupply, 0),
                        remaining: formatNumber(safeRemainingCount, 0),
                      })}
                    </span>
                  </div>
                  <div className="flex shrink-0 flex-1 flex-col items-end gap-0.5">
                    <strong className="text-base leading-6 font-bold text-foreground">
                      {formatActorPriceCeilDisplay(safeCurrentPrice)} USDC
                    </strong>
                    <span className="inline-flex items-center gap-1 text-xs leading-4 tracking-[0.04px] text-muted-foreground">
                      {t(pricingModeLabel)}
                      <button
                        type="button"
                        onClick={() => setPriceOpen(true)}
                        className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={t('查看价格说明')}
                      >
                        <IconHelpCircle className="size-4" />
                      </button>
                    </span>
                  </div>
                </div>
              </div>

              {!isFixedPricing ? (
                <p className="text-center text-xs leading-4 tracking-[0.04px] text-muted-foreground">
                  {t('已开启 1% 滑点保护，价格超出时将取消交易')}
                </p>
              ) : null}

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isPending}
                  className={cn(APP_DIALOG_SECONDARY_BUTTON_CLASS, 'h-11')}
                >
                  {t('取消')}
                </Button>
                {/* page&sheet/dark + white-to-dark：浅色深底白字 / 深色浅底深字 */}
                <Button
                  type="button"
                  onClick={onConfirm}
                  disabled={confirmDisabled || isPending}
                  className={cn(APP_DIALOG_PRIMARY_BUTTON_CLASS, 'h-11')}
                >
                  {isPending ? (
                    <span className="inline-flex items-center justify-center gap-2">
                      <Spinner className="size-4" />
                      <span>{t('确认签约')}</span>
                    </span>
                  ) : (
                    t('确认签约')
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <ActorPriceDialog
        open={priceOpen}
        onOpenChange={setPriceOpen}
        signedCount={mintedSupply}
        maxSupply={totalSupply}
        initialPrice={initialPrice}
        currentPrice={safeCurrentPrice}
        pricingMode={pricingMode}
      />
      {lv1Breakdown ? (
        <GameActorPowerDialog
          open={payDetailOpen}
          onOpenChange={setPayDetailOpen}
          breakdown={lv1Breakdown}
          level={lv1Rates?.lv1Level}
          actorName={actorName}
        />
      ) : null}
    </>
  );
}
