import type { Address } from '@solana/kit';
import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import {
  useListDeployedActors,
  useReplenishStamina,
} from '@/api/__generated__/mining/mining/mining';
import type { ActorDTO } from '@/api/__generated__/mining/model/actorDTO';
import type { ReplenishResult } from '@/api/__generated__/mining/model/replenishResult';
import { AppDialog } from '@/components/common/AppDialog';
import {
  APP_DIALOG_PRIMARY_BUTTON_CLASS,
  APP_DIALOG_SECONDARY_BUTTON_CLASS,
} from '@/components/common/appDialogButton';
import { Button } from '@/components/ui/button';
import {
  getGameActorStaminaLimit,
  getGameActorSupplyFee,
} from '@/features/game/constants/gameActorConfig';
import { isActorStaminaFull } from '@/features/game/constants/gameStamina';
import {
  markActorStaminaSyncing,
  patchActorStaminaInCache,
  pollActorStaminaSynced,
} from '@/features/game/gameActorStaminaCache';
import {
  buildGameBatchRefillItems,
  useGameBatchRefillActors,
} from '@/features/game/hooks/useGameBatchRefillActors';
import { unwrapOrvalPayload } from '@/features/mining/miningFormat';
import { notifyDirectWalletSimulationError } from '@/hooks/solana/directWallet';
import { useSubmitRefillActorStamina } from '@/hooks/solana/useSubmitRefillActorStamina';
import { getSponsorSubmitErrorMessage } from '@/hooks/sponsor/sponsorSubmitResult';
import { useSponsorSubmitRefillActorStamina } from '@/hooks/sponsor/useSponsorSubmitRefillActorStamina';
import { useAppPrivyAccount } from '@/hooks/useAppPrivyAccount';
import { useNotifyInsufficientUsdc } from '@/hooks/useNotifyInsufficientUsdc';
import { useConfigStore } from '@/stores/config';
import useGlobalStore from '@/stores/global';
import { refreshWalletAssets } from '@/stores/updater';
import {
  cn,
  formatNumber,
  isGreaterThanOrEqual,
  minus,
  plus,
  toNumber,
} from '@/utils';

import { GameDialogSubmitLabel } from './GameDialogSubmitLabel';

type GameRefillStaminaDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actor: ActorDTO | null;
  /** 链上补充成功后回调（如刷新候选列表）；补充确认弹窗仍会关闭 */
  onSuccess?: () => void;
};

/** Figma 637:75117：姓名 · LvN */
function formatRefillActorSummaryLine(actor: ActorDTO): string | undefined {
  const parts: string[] = [];

  const actorName = actor.actorName?.trim();
  if (actorName) {
    parts.push(actorName);
  }

  if (actor.level !== undefined) {
    parts.push(`Lv${actor.level}`);
  }

  return parts.length > 0 ? parts.join(' · ') : undefined;
}

const DIALOG_INFO_CARD_CLASS = cn(
  'flex w-full flex-col items-start justify-center gap-2',
  'rounded-xl bg-muted px-4 py-3',
);

const OR_DIVIDER_LINE_CLASS = 'h-px min-w-0 flex-1 bg-border';

export function GameRefillStaminaDialog({
  open,
  onOpenChange,
  actor,
  onSuccess,
}: GameRefillStaminaDialogProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const isLogin = useGlobalStore((state) => state.isLogin);
  const { isEmbeddedLogin, solanaAddress } = useAppPrivyAccount();
  const walletUsdcBalance = useGlobalStore((state) => state.walletUsdcBalance);
  const { notifyInsufficientUsdc } = useNotifyInsufficientUsdc();
  const initConfig = useConfigStore((state) => state.initConfig);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const replenishMutation = useReplenishStamina();
  const { executeRefillActorStamina, isReady: isWalletReady } =
    useSubmitRefillActorStamina();
  const { executeSponsorRefillActorStamina } =
    useSponsorSubmitRefillActorStamina();
  const {
    isPending: isBatchPending,
    isWalletReady: isBatchWalletReady,
    submitBatchRefill,
  } = useGameBatchRefillActors();

  const { data: deployedResponse } = useListDeployedActors({
    query: {
      enabled: isLogin && open,
      retry: false,
    },
  });

  const deployedActors = useMemo(
    () => unwrapOrvalPayload<ActorDTO[]>(deployedResponse) ?? [],
    [deployedResponse],
  );

  const staminaLimit = getGameActorStaminaLimit(initConfig ?? undefined);

  // 与派遣区一键补充同口径：未满体力角色与合计 supplyFee
  const refillAllSummary = useMemo(() => {
    const actors: ActorDTO[] = [];
    let totalCost: string | undefined;

    for (const item of deployedActors) {
      if (isActorStaminaFull(item.stamina, staminaLimit)) {
        continue;
      }

      actors.push(item);
      const supplyFee = getGameActorSupplyFee(
        initConfig ?? undefined,
        item.level,
      );

      if (supplyFee === undefined) {
        continue;
      }

      totalCost =
        totalCost === undefined
          ? String(supplyFee)
          : plus(totalCost, supplyFee);
    }

    return {
      actors,
      actorCount: actors.length,
      totalCost: totalCost === undefined ? undefined : toNumber(totalCost),
      items: buildGameBatchRefillItems(actors, initConfig ?? undefined),
    };
  }, [deployedActors, initConfig, staminaLimit]);

  const actorSummaryLine = actor
    ? formatRefillActorSummaryLine(actor)
    : undefined;
  const actorTokenId = actor?.actorTokenId;
  const actorNftId = actor?.actorNftId?.trim();
  const stamina = actor?.stamina;
  const replenishCost = getGameActorSupplyFee(
    initConfig ?? undefined,
    actor?.level,
  );

  // 稿面：0/168 → 168（当前/上限 → 补满后）
  const staminaTransitionLabel =
    stamina !== undefined && staminaLimit !== undefined
      ? `${formatNumber(stamina, 0)}/${formatNumber(staminaLimit, 0)} → ${formatNumber(staminaLimit, 0)}`
      : undefined;

  const isStaminaFull = isActorStaminaFull(stamina, staminaLimit);
  const isReplenishCostInsufficient =
    replenishCost !== undefined &&
    (walletUsdcBalance === undefined ||
      !isGreaterThanOrEqual(walletUsdcBalance, replenishCost));
  const isSingleRefillPending = isSubmitting || replenishMutation.isPending;
  const isAnyPending = isSingleRefillPending || isBatchPending;

  const handleConfirmReplenish = async () => {
    const walletAddress = solanaAddress?.trim();

    if (
      actorTokenId === undefined ||
      actorNftId === undefined ||
      isAnyPending ||
      isStaminaFull ||
      replenishCost === undefined ||
      !walletAddress ||
      !isWalletReady
    ) {
      return;
    }

    if (isReplenishCostInsufficient) {
      notifyInsufficientUsdc(minus(replenishCost, walletUsdcBalance ?? 0));
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await replenishMutation.mutateAsync({
        data: {
          actorNftId,
          payAmount: replenishCost,
          walletAddress,
        },
      });

      const result = unwrapOrvalPayload<ReplenishResult>(response);

      if (
        !result?.sig?.trim() ||
        !result.canonicalPayload?.trim() ||
        !result.payToken?.trim() ||
        !result.orderNo?.trim()
      ) {
        throw new Error('补充体力签名数据不完整');
      }

      const refillParams = {
        actorNftId,
        actorTokenId,
        actorCollectionId: actor?.actorCollectionId,
        orderNo: result.orderNo,
        canonicalPayload: result.canonicalPayload,
        sigBase64: result.sig,
        payTokenMint: result.payToken.trim() as Address,
      };

      if (isEmbeddedLogin) {
        await executeSponsorRefillActorStamina(refillParams);
      } else {
        await executeRefillActorStamina(refillParams);
      }

      const expectedStamina =
        result.afterStamina ?? staminaLimit ?? actor?.stamina;

      if (expectedStamina !== undefined) {
        patchActorStaminaInCache(queryClient, actorNftId, expectedStamina);
      }

      markActorStaminaSyncing(actorNftId);
      toast.success(t('恢复体力成功'));
      onOpenChange(false);
      onSuccess?.();
      void refreshWalletAssets();

      void pollActorStaminaSynced(queryClient, {
        actorNftId,
        beforeStamina: result.beforeStamina ?? stamina,
        afterStamina: result.afterStamina ?? staminaLimit,
        staminaLimit,
      });
    } catch (error) {
      if (
        notifyDirectWalletSimulationError(error, {
          t,
          logPrefix: '[GameRefillStaminaDialog] refill',
          fallbackToastKey: '恢复体力失败，请重试',
        })
      ) {
        return;
      }

      toast.error(
        getSponsorSubmitErrorMessage(error, t, '恢复体力失败，请重试'),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // 移动端「全部补充」：与桌面一键补充共用 batch_refill 流程
  const handleConfirmRefillAll = async () => {
    if (
      refillAllSummary.actorCount <= 0 ||
      refillAllSummary.items.length <= 0 ||
      isAnyPending ||
      !isBatchWalletReady
    ) {
      return;
    }

    const ok = await submitBatchRefill({
      items: refillAllSummary.items,
      totalCost: refillAllSummary.totalCost,
    });

    if (ok) {
      onOpenChange(false);
      onSuccess?.();
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const isConfirmDisabled =
    actorTokenId === undefined ||
    actorNftId === undefined ||
    isAnyPending ||
    isStaminaFull ||
    replenishCost === undefined ||
    !solanaAddress?.trim() ||
    !isWalletReady;

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('补充体力')}
      hideHeader
      width={343}
      bodyScroll={false}
      bodyClassName="p-4"
    >
      {/* Figma 637:75117 — 移动端：该角色 / 或 / 全部补充 */}
      <div className="flex flex-col items-center gap-6 md:hidden">
        <header className="flex w-full flex-col items-center text-center">
          <h2 className="m-0 w-full text-lg leading-[26px] font-bold tracking-[-0.04px] text-foreground">
            {t('补充体力')}
          </h2>
        </header>

        <div className="flex w-full flex-col gap-4">
          <div className="flex w-full flex-col gap-3">
            <div className={DIALOG_INFO_CARD_CLASS}>
              <div className="flex w-full items-start justify-between gap-2 text-sm leading-5 text-foreground">
                <p className="m-0 min-w-0 truncate text-left">
                  {actorSummaryLine ?? '-'}
                </p>
                {staminaTransitionLabel ? (
                  <p className="m-0 shrink-0 whitespace-nowrap text-right">
                    {staminaTransitionLabel}
                  </p>
                ) : null}
              </div>

              <div className="h-px w-full bg-border" />

              <div className="flex w-full items-start justify-between gap-2 text-base leading-6 font-bold">
                <p className="m-0 text-foreground">{t('花费')}</p>
                {replenishCost !== undefined ? (
                  <p className="m-0 whitespace-nowrap text-destructive">
                    {`${formatNumber(replenishCost, 1)} USDC`}
                  </p>
                ) : (
                  <p className="m-0 text-destructive">-</p>
                )}
              </div>
            </div>

            <Button
              type="button"
              className={cn(
                'h-11 w-full rounded-xl',
                'bg-foreground text-background',
                'text-sm leading-5 font-bold',
                'hover:bg-foreground/90 hover:text-background',
              )}
              disabled={isConfirmDisabled}
              onClick={handleConfirmReplenish}
            >
              <GameDialogSubmitLabel isPending={isSingleRefillPending}>
                {t('该角色')}
              </GameDialogSubmitLabel>
            </Button>
          </div>

          <div className="flex w-full items-center gap-4">
            <div className={OR_DIVIDER_LINE_CLASS} />
            <span className="shrink-0 text-xs leading-4 tracking-[0.04px] text-muted-foreground">
              {t('或')}
            </span>
            <div className={OR_DIVIDER_LINE_CLASS} />
          </div>

          <div className="flex w-full flex-col gap-3">
            <div className={DIALOG_INFO_CARD_CLASS}>
              <p className="m-0 w-full text-left text-sm leading-5 text-foreground">
                {t('补充全部演出中角色')}
              </p>

              <div className="h-px w-full bg-border" />

              <div className="flex w-full items-start justify-between gap-2 text-base leading-6 font-bold">
                <p className="m-0 text-foreground">
                  {t('{{count}} 位', {
                    count: formatNumber(refillAllSummary.actorCount, 0),
                  })}
                </p>
                {refillAllSummary.totalCost !== undefined ? (
                  <p className="m-0 whitespace-nowrap text-destructive">
                    {`${formatNumber(refillAllSummary.totalCost, 1)} USDC`}
                  </p>
                ) : (
                  <p className="m-0 text-destructive">-</p>
                )}
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className={cn(
                'h-11 w-full rounded-xl border-[1.5px]',
                'text-sm leading-5 font-bold text-foreground',
              )}
              disabled={
                refillAllSummary.actorCount <= 0 ||
                refillAllSummary.items.length <= 0 ||
                isAnyPending ||
                !isBatchWalletReady
              }
              onClick={handleConfirmRefillAll}
            >
              <GameDialogSubmitLabel isPending={isBatchPending}>
                {t('全部补充')}
              </GameDialogSubmitLabel>
            </Button>
          </div>
        </div>
      </div>

      {/* 桌面：单角色取消 / 确认（批量走区块「一键补充」） */}
      <div className="hidden flex-col items-center gap-6 md:flex">
        <header className="flex w-full flex-col items-center gap-1 text-center">
          <h2 className="m-0 w-full text-lg leading-[26px] font-bold tracking-[-0.04px] text-foreground">
            {t('恢复体力')}
          </h2>
          {actorSummaryLine ? (
            <p className="w-full truncate text-xs leading-4 tracking-[0.04px] text-muted-foreground">
              {actorSummaryLine}
            </p>
          ) : null}
        </header>

        {staminaTransitionLabel || replenishCost !== undefined ? (
          <div
            className={cn(
              'flex w-full flex-col items-start justify-center gap-4',
              'rounded-xl bg-destructive/5 px-4 py-3',
            )}
          >
            <div className="flex w-full flex-col gap-1 text-center">
              {staminaTransitionLabel ? (
                <p className="m-0 w-full text-lg leading-[26px] font-bold tracking-[-0.04px] text-foreground">
                  {staminaTransitionLabel}
                </p>
              ) : null}
              {replenishCost !== undefined ? (
                <p className="m-0 w-full text-lg leading-[26px] font-bold tracking-[-0.04px] text-destructive">
                  {t('花费 {{amount}} USDC', {
                    amount: formatNumber(replenishCost, 1),
                  })}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="flex w-full gap-3">
          <Button
            type="button"
            variant="outline"
            className={cn(APP_DIALOG_SECONDARY_BUTTON_CLASS, 'h-11')}
            disabled={isAnyPending}
            onClick={handleCancel}
          >
            {t('取消')}
          </Button>
          <Button
            type="button"
            className={cn(APP_DIALOG_PRIMARY_BUTTON_CLASS, 'h-11')}
            disabled={isConfirmDisabled}
            onClick={handleConfirmReplenish}
          >
            <GameDialogSubmitLabel isPending={isSingleRefillPending}>
              {t('确认')}
            </GameDialogSubmitLabel>
          </Button>
        </div>
      </div>
    </AppDialog>
  );
}
