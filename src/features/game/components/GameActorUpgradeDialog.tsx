import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import {
  getUpgradableCountQueryKey,
  useMaterials,
} from '@/api/__generated__/mining/actor-level-upgrade/actor-level-upgrade';
import { getListDeployedActorsQueryKey } from '@/api/__generated__/mining/mining/mining';
import type { ActorDTO } from '@/api/__generated__/mining/model/actorDTO';
import type { ActorLevelUpgradeMaterialResponse } from '@/api/__generated__/mining/model/actorLevelUpgradeMaterialResponse';
import { MintActorNftRequestPayMethod } from '@/api/__generated__/story/model/mintActorNftRequestPayMethod';
import type { ActorNftUpgradeOrderResponse } from '@/api/__generated__/wallet/model/actorNftUpgradeOrderResponse';
import { useUpgradeOrder } from '@/api/__generated__/wallet/userwallet-actornft/userwallet-actornft';
import IconBolt from '@/assets/svg/IconBolt';
import IconCircleCheck from '@/assets/svg/IconCircleCheck';
import { AppDialog } from '@/components/common/AppDialog';
import AppLoadingContainer from '@/components/common/AppLoadingContainer';
import {
  APP_DIALOG_PRIMARY_BUTTON_CLASS,
  APP_DIALOG_SECONDARY_BUTTON_CLASS,
} from '@/components/common/appDialogButton';
import { Button } from '@/components/ui/button';
import { formatActorIpDisplay } from '@/features/actor/actorFormat';
import {
  getGameActorStaminaLimit,
  getGameActorUpgradeConfig,
  isGameActorMaxLevel,
} from '@/features/game/constants/gameActorConfig';
import {
  buildActorAssetId,
  resolveCollectionAssetIdFromActorNftId,
  resolveMainActorAssetId,
} from '@/features/game/constants/gameActorNft';
import {
  type GameListAllActorsPollContext,
  markActorUpgradeSyncing,
  patchActorFieldsInAllActorsCache,
  pollActorUpgradeSynced,
} from '@/features/game/gameActorStaminaCache';
import { getGameActorUpgradeRequirementState } from '@/features/game/getGameActorUpgradeRequirementState';
import { useActorCompletePlayRequirementSatisfied } from '@/features/game/useActorCompletePlayRequirementSatisfied';
import { unwrapOrvalPayload } from '@/features/mining/miningFormat';
import { resolveActorPayTokenMint } from '@/hooks/solana/actorMint/resolveActorPayTokenMint';
import { notifyDirectWalletSimulationError } from '@/hooks/solana/directWallet';
import { useSubmitUpgradeActorNft } from '@/hooks/solana/useSubmitUpgradeActorNft';
import { getSponsorSubmitErrorMessage } from '@/hooks/sponsor/sponsorSubmitResult';
import { useSponsorSubmitUpgradeActorNft } from '@/hooks/sponsor/useSponsorSubmitUpgradeActorNft';
import { useAppPrivyAccount } from '@/hooks/useAppPrivyAccount';
import { useGlobalConfig } from '@/hooks/useGlobalConfig';
import { useNotifyInsufficientUsdc } from '@/hooks/useNotifyInsufficientUsdc';
import { getCurrentChain } from '@/solana/chainConfig';
import { useConfigStore } from '@/stores/config';
import useGlobalStore from '@/stores/global';
import { refreshWalletAssets } from '@/stores/updater';
import { cn, formatNumber, isGreaterThanOrEqual, minus } from '@/utils';
import { readSnowflakeId } from '@/utils/snowflakeId';

import { GameActorUpgradeCompareSection } from './GameActorUpgradeCompareSection';
import { GameDialogSubmitLabel } from './GameDialogSubmitLabel';

type GameActorUpgradeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actor: ActorDTO | null;
  /** 挖矿中仅查看升级要求，不可选耗材、不可提交升级 */
  readOnly?: boolean;
  upgradeListContext: GameListAllActorsPollContext;
};

function formatMaterialActorCode(
  material: ActorLevelUpgradeMaterialResponse,
): string | undefined {
  const actorId = material.actorId?.trim();
  if (!actorId) {
    return undefined;
  }

  const rawValue = actorId.startsWith('#') ? actorId.slice(1) : actorId;
  return `#${formatActorIpDisplay(rawValue)}`;
}

function getMaterialListKey(
  material: ActorLevelUpgradeMaterialResponse,
): string {
  return readSnowflakeId(material.actorId) ?? material.actorName ?? 'material';
}

function readMaterialActorTokenId(
  actorId: string | undefined,
): number | undefined {
  const parsed = Number(actorId?.trim());
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    return undefined;
  }

  return parsed;
}

function unwrapMaterialsList(
  response: { data?: unknown } | undefined,
): ActorLevelUpgradeMaterialResponse[] {
  const payload = unwrapOrvalPayload<unknown>(response);

  if (Array.isArray(payload)) {
    return payload;
  }

  return [];
}

function unwrapUpgradeOrderResponse(
  response: { data?: unknown } | undefined,
): ActorNftUpgradeOrderResponse | undefined {
  const payload = unwrapOrvalPayload<ActorNftUpgradeOrderResponse>(response);

  if (!payload || typeof payload !== 'object') {
    return undefined;
  }

  return payload;
}

export function GameActorUpgradeDialog({
  open,
  onOpenChange,
  actor,
  readOnly = false,
  upgradeListContext,
}: GameActorUpgradeDialogProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { isEmbeddedLogin, solanaAddress } = useAppPrivyAccount();
  const walletUsdcBalance = useGlobalStore((state) => state.walletUsdcBalance);
  const { notifyInsufficientUsdc } = useNotifyInsufficientUsdc();
  const { chainlinks } = useGlobalConfig();
  const initConfig = useConfigStore((state) => state.initConfig);
  const [selectedMaterialTokenIds, setSelectedMaterialTokenIds] = useState<
    Set<number>
  >(() => new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const actorName = actor?.actorName?.trim();
  const actorCode =
    actor?.actorTokenId !== undefined
      ? `#${formatNumber(actor.actorTokenId, 0)}`
      : undefined;

  const actorNftId = readSnowflakeId(actor?.actorNftId);
  const actorTokenId = actor?.actorTokenId;
  const materialsParams = actorNftId ? { actorNftId } : { actorNftId: '' };

  const actorCollectionId = actor?.actorCollectionId;

  const initUpgradeConfig = getGameActorUpgradeConfig(
    initConfig ?? undefined,
    actor?.level,
  );
  const hasNextLevelUpgrade = initUpgradeConfig !== undefined;
  const isMaxLevel = isGameActorMaxLevel(initConfig ?? undefined, actor?.level);

  const staminaLimit = getGameActorStaminaLimit(initConfig ?? undefined);

  const { heatThreshold, isHeatRequirementMet } =
    useActorCompletePlayRequirementSatisfied(actor, {
      enabled: open && actorCollectionId !== undefined,
    });

  // 可提交升级：非只读 + 有下一级 + 完播达标
  const isUpgradeInteractive =
    !readOnly && isHeatRequirementMet && hasNextLevelUpgrade;

  // 可拉耗材 / 展示选择列表：完播未达标也要请求 materials（提交仍受 isUpgradeInteractive 约束）
  const canSelectMaterials = !readOnly && hasNextLevelUpgrade;
  const canFetchMaterials = open && Boolean(actorNftId) && canSelectMaterials;

  const {
    data: materialsResponse,
    isPending: isMaterialsPending,
    isFetching: isMaterialsFetching,
    isError: isMaterialsError,
  } = useMaterials(materialsParams, {
    query: {
      enabled: canFetchMaterials,
      retry: false,
      refetchOnMount: true,
    },
  });

  const materials = useMemo(
    () => unwrapMaterialsList(materialsResponse),
    [materialsResponse],
  );

  const materialUpgradeRequirement = materials[0]?.upgradeRequirement;
  const requiredMaterialCount =
    materialUpgradeRequirement?.requiredMaterialCount ??
    initUpgradeConfig?.requiredMaterialCount;
  const toLevel =
    materialUpgradeRequirement?.toLevel ?? initUpgradeConfig?.toLevel;
  const upgradeFee = materialUpgradeRequirement?.fee ?? initUpgradeConfig?.fee;

  const selectedCount = selectedMaterialTokenIds.size;

  // 片酬对比：与升级列表卡同一套 current/next 估算
  const storyRateState = actor
    ? getGameActorUpgradeRequirementState(actor, initConfig ?? undefined)
    : null;

  const isUpgradeFeeInsufficient =
    upgradeFee !== undefined &&
    (walletUsdcBalance === undefined ||
      !isGreaterThanOrEqual(walletUsdcBalance, upgradeFee));

  const isMaterialsLoading =
    canFetchMaterials && (isMaterialsPending || isMaterialsFetching);
  const isMaterialsUnavailable = open && !actorNftId;
  const materialsContainerError = isMaterialsError;
  const materialsEmptyDescription = isMaterialsUnavailable
    ? t('角色 ID 无效，请刷新列表后重试')
    : t('没有可消耗的同IP同等级角色');

  const dialogTitleName = [actorName, actorCode].filter(Boolean).join(' ');
  const dialogTitle = dialogTitleName
    ? t('升级 {{name}}', { name: dialogTitleName })
    : t('升级');

  const upgradeOrderMutation = useUpgradeOrder();
  const { executeUpgradeActorNft, isReady: isWalletReady } =
    useSubmitUpgradeActorNft();
  const { executeSponsorUpgradeActorNft } = useSponsorSubmitUpgradeActorNft();

  const isPending = isSubmitting || upgradeOrderMutation.isPending;

  useEffect(() => {
    if (!open) {
      setSelectedMaterialTokenIds(new Set());
    }
  }, [open]);

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleToggleMaterial = (materialTokenId: number) => {
    setSelectedMaterialTokenIds((previous) => {
      const next = new Set(previous);

      if (next.has(materialTokenId)) {
        next.delete(materialTokenId);
        return next;
      }

      if (
        requiredMaterialCount !== undefined &&
        next.size >= requiredMaterialCount
      ) {
        return previous;
      }

      next.add(materialTokenId);
      return next;
    });
  };

  // 列表项点击：切换选中耗材（受 requiredMaterialCount 上限约束）
  const handleSelectMaterial = (materialTokenId: number) => () => {
    handleToggleMaterial(materialTokenId);
  };

  const handleConfirmUpgrade = async () => {
    const walletAddress = solanaAddress?.trim();

    if (
      !actorNftId ||
      actorTokenId === undefined ||
      actorCollectionId === undefined ||
      !walletAddress ||
      !isWalletReady ||
      isPending ||
      requiredMaterialCount === undefined ||
      selectedCount !== requiredMaterialCount
    ) {
      return;
    }

    if (isUpgradeFeeInsufficient) {
      notifyInsufficientUsdc(minus(upgradeFee ?? 0, walletUsdcBalance ?? 0));
      return;
    }

    const burnNftTokenIds = [...selectedMaterialTokenIds];
    const collectionAssetId = resolveCollectionAssetIdFromActorNftId(
      actorNftId ?? '',
      actorCollectionId,
    );

    const mainAssetId = resolveMainActorAssetId({
      actorNftId,
      actorCollectionId,
      actorTokenId,
    });

    if (!collectionAssetId || !mainAssetId) {
      toast.error(t('升级失败，请重试'));
      return;
    }

    const burnAssetIds = burnNftTokenIds.map((tokenId) =>
      buildActorAssetId(collectionAssetId, tokenId),
    );

    setIsSubmitting(true);

    try {
      const orderResponse = await upgradeOrderMutation.mutateAsync({
        data: {
          actorCollectionId: collectionAssetId as unknown as number,
          walletAddress,
          mainNftTokenId: actorTokenId,
          burnNftTokenIds,
        },
      });

      const order = unwrapUpgradeOrderResponse(orderResponse);

      if (!order?.sig?.trim() || !order.payload?.trim()) {
        throw new Error('升级订单签名数据不完整');
      }

      const payTokenEnv = import.meta.env.VITE_PAY_TOKEN?.toLowerCase();
      const payToken =
        payTokenEnv === 'usdc'
          ? MintActorNftRequestPayMethod.usdc
          : payTokenEnv === 'usdt'
            ? MintActorNftRequestPayMethod.usdt
            : MintActorNftRequestPayMethod.point;
      const payTokenMint = resolveActorPayTokenMint(
        chainlinks,
        getCurrentChain(),
        payToken,
      );

      if (!payTokenMint) {
        throw new Error('支付代币配置无效');
      }

      const upgradeParams = {
        mainAssetId,
        burnAssetIds,
        actorCollectionId: collectionAssetId,
        canonicalPayload: order.payload.trim(),
        sigBase64: order.sig,
        payTokenMint,
      };

      if (isEmbeddedLogin) {
        await executeSponsorUpgradeActorNft(upgradeParams);
      } else {
        await executeUpgradeActorNft(upgradeParams);
      }

      const fromLevel = actor?.level;
      const optimisticMiningCoefficient =
        toLevel !== undefined
          ? initConfig?.actorNft?.levels?.[String(toLevel)]?.miningCoefficient
          : undefined;

      if (toLevel !== undefined) {
        patchActorFieldsInAllActorsCache(queryClient, actorNftId, {
          level: toLevel,
          ...(optimisticMiningCoefficient !== undefined
            ? { miningCoefficient: optimisticMiningCoefficient }
            : {}),
        });
      }

      markActorUpgradeSyncing(actorNftId);
      toast.success(t('升级成功'));
      onOpenChange(false);
      void refreshWalletAssets();
      void queryClient.invalidateQueries({
        queryKey: getUpgradableCountQueryKey(),
      });
      // 派遣中角色升级后刷新派遣列表（等级 / 片酬等）
      void queryClient.invalidateQueries({
        queryKey: getListDeployedActorsQueryKey(),
      });

      void pollActorUpgradeSynced(queryClient, {
        actorNftId,
        fromLevel,
        toLevel,
        listContext: upgradeListContext,
      }).then((pollResult) => {
        if (pollResult === 'timeout') {
          toast.error(t('升级同步较慢，请稍后刷新页面'));
          return;
        }

        // 后端等级同步完成后再拉一次派遣列表，避免首刷仍是旧等级
        void queryClient.invalidateQueries({
          queryKey: getListDeployedActorsQueryKey(),
        });
      });
    } catch (error) {
      if (
        notifyDirectWalletSimulationError(error, {
          t,
          logPrefix: '[GameActorUpgradeDialog] upgrade',
          fallbackToastKey: '升级失败，请重试',
        })
      ) {
        return;
      }

      console.error('[GameActorUpgradeDialog] upgrade.failed', error);
      toast.error(getSponsorSubmitErrorMessage(error, t, '升级失败，请重试'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSubmitDisabled =
    !actorNftId ||
    actorTokenId === undefined ||
    actorCollectionId === undefined ||
    !solanaAddress?.trim() ||
    isPending ||
    isMaterialsLoading ||
    requiredMaterialCount === undefined ||
    selectedCount !== requiredMaterialCount ||
    (heatThreshold !== undefined && !isHeatRequirementMet);

  const upgradeFeeAmountClassName = isUpgradeFeeInsufficient
    ? 'text-destructive'
    : 'text-game-upgrade-fee';

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={dialogTitle}
      width={400}
    >
      {/* Figma 198:44099 / 191:43793 — gap-24 */}
      <div className="flex flex-col gap-6">
        {hasNextLevelUpgrade ? (
          <GameActorUpgradeCompareSection
            fromLevel={actor?.level}
            toLevel={toLevel}
            currentStoryRate={storyRateState?.currentStoryRate}
            nextStoryRate={storyRateState?.nextStoryRate}
          />
        ) : isMaxLevel ? (
          <div
            className={cn(
              'flex items-center justify-center',
              'rounded-lg px-3 py-2',
              'bg-game-upgrade-compare-surface',
            )}
          >
            <p className="text-sm leading-5 font-bold text-foreground">
              {t('已达到顶级咖位')}
            </p>
          </div>
        ) : null}

        {canSelectMaterials ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm leading-5 font-bold text-foreground">
                {t('选择要消耗的同IP同等级角色')}
              </h3>
              {requiredMaterialCount !== undefined ? (
                <span className="text-xs leading-4 font-medium tracking-[0.04px] text-foreground">
                  {selectedCount}/{formatNumber(requiredMaterialCount, 0)}
                </span>
              ) : null}
            </div>

            <AppLoadingContainer
              data={isMaterialsLoading ? null : materials}
              isLoading={isMaterialsLoading}
              isError={materialsContainerError}
              minHeight={120}
              emptyDescription={materialsEmptyDescription}
              scrollable={false}
            >
              <ul className="flex flex-col gap-2">
                {materials.map((material) => {
                  const listKey = getMaterialListKey(material);
                  const materialTokenId = readMaterialActorTokenId(
                    material.actorId,
                  );
                  const materialName = material.actorName?.trim();
                  const materialCode = formatMaterialActorCode(material);
                  const isSelected =
                    materialTokenId !== undefined &&
                    selectedMaterialTokenIds.has(materialTokenId);
                  const materialStaminaLimit =
                    material.staminaLimit ?? staminaLimit;
                  const staminaSummary =
                    material.stamina !== undefined &&
                    materialStaminaLimit !== undefined
                      ? `${formatNumber(material.stamina, 0)}/${formatNumber(materialStaminaLimit, 0)}`
                      : undefined;

                  return (
                    <li key={listKey}>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={!materialTokenId || isPending}
                        onClick={
                          materialTokenId !== undefined
                            ? handleSelectMaterial(materialTokenId)
                            : undefined
                        }
                        className={cn(
                          'h-auto w-full justify-start gap-3',
                          'rounded-xl border-border px-4 py-3',
                          'text-left font-normal shadow-none',
                          'hover:bg-game-upgrade-compare-surface/60',
                          'disabled:cursor-not-allowed disabled:opacity-60',
                        )}
                      >
                        <IconCircleCheck
                          selected={isSelected}
                          className="size-6 shrink-0"
                        />
                        <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-1">
                            {materialName ? (
                              <span className="truncate text-sm leading-5 font-bold text-foreground">
                                {materialName}
                              </span>
                            ) : null}
                            {materialCode ? (
                              <span className="shrink-0 text-xs leading-4 tracking-[0.04px] text-muted-foreground">
                                {materialCode}
                              </span>
                            ) : null}
                          </div>
                          <div className="flex shrink-0 items-center gap-3">
                            {material.level !== undefined ? (
                              <span className="text-xs leading-4 tracking-[0.04px] text-foreground">
                                Lv{material.level}
                              </span>
                            ) : null}
                            {staminaSummary ? (
                              <div className="flex items-center gap-0.5">
                                <IconBolt className="size-4 text-game-panel-dot-success" />
                                <span className="text-xs leading-4 tracking-[0.04px] text-muted-foreground">
                                  {staminaSummary}
                                </span>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </AppLoadingContainer>
          </div>
        ) : null}

        {hasNextLevelUpgrade && upgradeFee !== undefined ? (
          <div
            className={cn(
              'flex items-center justify-between',
              'rounded-2xl px-4 py-2',
              'bg-game-upgrade-compare-surface',
            )}
          >
            <span className="text-sm leading-5 font-bold text-foreground">
              {t('升级费用')}
            </span>
            <div className="flex items-baseline gap-1.5">
              <span
                className={cn(
                  'text-base leading-6 font-bold',
                  upgradeFeeAmountClassName,
                )}
              >
                {formatNumber(upgradeFee, 0)}
              </span>
              <span className="text-xs leading-4 font-normal tracking-[0.04px] text-muted-foreground">
                USDC
              </span>
            </div>
          </div>
        ) : null}
      </div>

      {/* 与规则弹窗一致：贴底 sticky，滚动正文时操作按钮始终可见 */}
      <footer
        className={cn(
          'sticky bottom-0 z-10 flex shrink-0 gap-3',
          // 抵消 AppDialog 默认 bodyClassName=px-6 pb-6，贴齐滚动区底边
          '-mx-6 -mb-6 mt-6 w-[calc(100%+3rem)]',
          'border-t border-border bg-background px-6 py-4',
        )}
      >
        <Button
          type="button"
          variant="outline"
          className={APP_DIALOG_SECONDARY_BUTTON_CLASS}
          disabled={canSelectMaterials && isPending}
          onClick={handleClose}
        >
          {t('关闭')}
        </Button>
        {canSelectMaterials ? (
          <Button
            type="button"
            className={APP_DIALOG_PRIMARY_BUTTON_CLASS}
            disabled={isSubmitDisabled || !isUpgradeInteractive}
            onClick={handleConfirmUpgrade}
          >
            <GameDialogSubmitLabel isPending={isPending}>
              {t('确认升级')}
            </GameDialogSubmitLabel>
          </Button>
        ) : null}
      </footer>
    </AppDialog>
  );
}
