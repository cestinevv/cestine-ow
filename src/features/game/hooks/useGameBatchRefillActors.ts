import type { Address } from '@solana/kit';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { useReplenishStaminaBatch } from '@/api/__generated__/mining/mining/mining';
import type { ActorDTO } from '@/api/__generated__/mining/model/actorDTO';
import type { ReplenishBatchResult } from '@/api/__generated__/mining/model/replenishBatchResult';
import type { ReplenishStaminaBatchItem } from '@/api/__generated__/mining/model/replenishStaminaBatchItem';
import { getGameActorSupplyFee } from '@/features/game/constants/gameActorConfig';
import { GAME_DEPLOY_SLOT_COUNT } from '@/features/game/constants/gameConstants';
import {
  markActorStaminaSyncing,
  patchActorStaminaInCache,
  pollActorStaminaSynced,
} from '@/features/game/gameActorStaminaCache';
import { unwrapOrvalPayload } from '@/features/mining/miningFormat';
import { notifyDirectWalletSimulationError } from '@/hooks/solana/directWallet';
import { useSubmitBatchRefillActorStamina } from '@/hooks/solana/useSubmitBatchRefillActorStamina';
import { getSponsorSubmitErrorMessage } from '@/hooks/sponsor/sponsorSubmitResult';
import { useSponsorSubmitBatchRefillActorStamina } from '@/hooks/sponsor/useSponsorSubmitBatchRefillActorStamina';
import { useAppPrivyAccount } from '@/hooks/useAppPrivyAccount';
import { useNotifyInsufficientUsdc } from '@/hooks/useNotifyInsufficientUsdc';
import type { InitConfig } from '@/stores/config';
import { useConfigStore } from '@/stores/config';
import useGlobalStore from '@/stores/global';
import { refreshWalletAssets } from '@/stores/updater';
import { isGreaterThanOrEqual, minus } from '@/utils';

export type GameBatchRefillActorItem = {
  actorNftId: string;
  payAmount: number;
  beforeStamina?: number;
};

/** 从未满体力的演出中角色列表构造批量补充 items。 */
export function buildGameBatchRefillItems(
  actors: ActorDTO[],
  initConfig: InitConfig | undefined,
): GameBatchRefillActorItem[] {
  const items: GameBatchRefillActorItem[] = [];

  for (const actor of actors) {
    const actorNftId = actor.actorNftId?.trim();
    if (!actorNftId) {
      continue;
    }

    const payAmount = getGameActorSupplyFee(
      initConfig ?? undefined,
      actor.level,
    );
    if (payAmount === undefined) {
      continue;
    }

    items.push({
      actorNftId,
      payAmount,
      beforeStamina: actor.stamina,
    });
  }

  return items;
}

/** 一键补充 / 移动端全部补充共用：预下单 → 链上 batch_refill → 缓存同步。 */
export function useGameBatchRefillActors() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { isEmbeddedLogin, solanaAddress } = useAppPrivyAccount();
  const walletUsdcBalance = useGlobalStore((state) => state.walletUsdcBalance);
  const { notifyInsufficientUsdc } = useNotifyInsufficientUsdc();
  const initConfig = useConfigStore((state) => state.initConfig);
  const staminaLimit = initConfig?.actorNft?.staminaLimit;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const replenishBatchMutation = useReplenishStaminaBatch();
  const { executeBatchRefillActorStamina, isReady: isWalletReady } =
    useSubmitBatchRefillActorStamina();
  const { executeSponsorBatchRefillActorStamina } =
    useSponsorSubmitBatchRefillActorStamina();

  const isPending = isSubmitting || replenishBatchMutation.isPending;

  async function submitBatchRefill(params: {
    items: GameBatchRefillActorItem[];
    totalCost: number | undefined;
  }): Promise<boolean> {
    const { items, totalCost } = params;
    const walletAddress = solanaAddress?.trim();

    if (items.length <= 0 || isPending || !walletAddress || !isWalletReady) {
      return false;
    }

    if (items.length > GAME_DEPLOY_SLOT_COUNT) {
      toast.error(t('恢复体力失败，请重试'));
      return false;
    }

    if (
      totalCost !== undefined &&
      (walletUsdcBalance === undefined ||
        !isGreaterThanOrEqual(walletUsdcBalance, totalCost))
    ) {
      notifyInsufficientUsdc(minus(totalCost, walletUsdcBalance ?? 0));
      return false;
    }

    setIsSubmitting(true);

    try {
      const batchItems: ReplenishStaminaBatchItem[] = items.map((item) => ({
        actorNftId: item.actorNftId,
        payAmount: item.payAmount,
      }));

      const response = await replenishBatchMutation.mutateAsync({
        data: {
          items: batchItems,
          walletAddress,
        },
      });

      const result = unwrapOrvalPayload<ReplenishBatchResult>(response);

      if (
        !result?.sig?.trim() ||
        !result.canonicalPayload?.trim() ||
        !result.payToken?.trim() ||
        !result.orderNo?.trim()
      ) {
        throw new Error('批量补充体力签名数据不完整');
      }

      // 链上 remaining / payload 顺序以后端返回的 items 为准，缺失时回退请求列表
      const actorNftIds = (
        result.items
          ?.map((item) => item.actorNftId?.trim())
          .filter((id): id is string => Boolean(id)) ??
        items.map((item) => item.actorNftId)
      ).slice(0, GAME_DEPLOY_SLOT_COUNT);

      if (actorNftIds.length === 0) {
        throw new Error('批量补充体力角色列表为空');
      }

      const chainParams = {
        actorNftIds,
        orderNo: result.orderNo,
        canonicalPayload: result.canonicalPayload,
        sigBase64: result.sig,
        payTokenMint: result.payToken.trim() as Address,
      };

      if (isEmbeddedLogin) {
        await executeSponsorBatchRefillActorStamina(chainParams);
      } else {
        await executeBatchRefillActorStamina(chainParams);
      }

      for (const item of result.items ?? []) {
        const actorNftId = item.actorNftId?.trim();
        if (!actorNftId) {
          continue;
        }

        const expectedStamina = item.afterStamina ?? staminaLimit;
        if (expectedStamina !== undefined) {
          patchActorStaminaInCache(queryClient, actorNftId, expectedStamina);
        }

        markActorStaminaSyncing(actorNftId);
      }

      toast.success(t('恢复体力成功'));
      void refreshWalletAssets();

      for (const item of result.items ?? []) {
        const actorNftId = item.actorNftId?.trim();
        if (!actorNftId) {
          continue;
        }

        void pollActorStaminaSynced(queryClient, {
          actorNftId,
          beforeStamina: item.beforeStamina,
          afterStamina: item.afterStamina ?? staminaLimit,
          staminaLimit,
        });
      }

      return true;
    } catch (error) {
      if (
        notifyDirectWalletSimulationError(error, {
          t,
          logPrefix: '[useGameBatchRefillActors] batch refill',
          fallbackToastKey: '恢复体力失败，请重试',
        })
      ) {
        return false;
      }

      toast.error(
        getSponsorSubmitErrorMessage(error, t, '恢复体力失败，请重试'),
      );
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    isPending,
    isWalletReady,
    solanaAddress,
    submitBatchRefill,
  };
}
