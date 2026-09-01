import type { Address } from '@solana/kit';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  getListActorCollectionsQueryKey,
  mintActorNft,
} from '@/api/__generated__/story/actor-i-p/actor-i-p';
import type { ActorCollectionResponse } from '@/api/__generated__/story/model/actorCollectionResponse';
import type { MintActorNftRequest } from '@/api/__generated__/story/model/mintActorNftRequest';
import { MintActorNftRequestPayMethod } from '@/api/__generated__/story/model/mintActorNftRequestPayMethod';
import { getVaultDepositQueryKey } from '@/api/__generated__/wallet/userwallet-actornft/userwallet-actornft';
import {
  formatActorIpDisplay,
  getActorMintDialogViewModel,
} from '@/features/actor/actorFormat';
import {
  ActorMintDialogStep,
  type ActorMintDialogViewModel,
} from '@/features/actor/actorMintDialogTypes';
import { getActorPublicDetailQueryKey } from '@/features/actor/actorPublicApi';
import { resolveCreateActorCollectionMintAddress } from '@/hooks/solana/actorCollection/resolveCreateActorCollectionAccounts';
import { resolveActorPayTokenMint } from '@/hooks/solana/actorMint/resolveActorPayTokenMint';
import { notifyDirectWalletSimulationError } from '@/hooks/solana/directWallet';
import {
  getMintActorOnChainContextMissingFields,
  readActorDigestFeeAmount,
  resolveActorCollectionAssetId,
  resolveMintActorOnChainContext,
  useMintActorNftOnChain,
} from '@/hooks/solana/useMintActorNftOnChain';
import { extractMintDigestBody } from '@/hooks/sponsor/actorMint/extractMintDigestBody';
import { useSponsorMintActorNft } from '@/hooks/sponsor/actorMint/useSponsorMintActorNft';
import { getSponsorSubmitErrorMessage } from '@/hooks/sponsor/sponsorSubmitResult';
import { useAppPrivyAccount } from '@/hooks/useAppPrivyAccount';
import { useNotifyInsufficientUsdc } from '@/hooks/useNotifyInsufficientUsdc';
import { getCurrentChain } from '@/solana/chainConfig';
import { useConfigStore } from '@/stores/config';
import useGlobalStore from '@/stores/global';
import { refreshOnChainWalletBalances } from '@/stores/updater';
import { isGreaterThanOrEqual, minus } from '@/utils';
import { readSnowflakeId } from '@/utils/snowflakeId';

import { ActorSignDialog } from './ActorSignDialog';
import { MintActorNftSuccessDialog } from './MintActorNftSuccessDialog';

/** Mint 成功后按入口刷新对应列表 / 详情缓存 */
export type ActorMintSuccessRefreshTarget = 'plaza' | 'detail';

type ActorMintDialogsProps = {
  actor: ActorCollectionResponse | null;
  /** 列表 / 详情已展示的「可 Mint 余量」（后端列表/详情口径） */
  availableMint?: number;
  /** 父组件 Mint 按钮置为 true 时打开确认弹窗 */
  active: boolean;
  onInactive: () => void;
  /** 广场卡：刷新角色列表；详情页：刷新角色详情 */
  refreshTarget: ActorMintSuccessRefreshTarget;
  /** 复用卡片的其他列表可在 Mint 成功后刷新自身缓存。 */
  onMintSuccess?: () => Promise<unknown> | unknown;
};

async function invalidateAfterActorMintSuccess(
  queryClient: ReturnType<typeof useQueryClient>,
  actorId: string,
  refreshTarget: ActorMintSuccessRefreshTarget,
): Promise<void> {
  await queryClient.invalidateQueries({
    queryKey: getVaultDepositQueryKey({
      actorCollectionId: actorId as unknown as number,
    }),
  });

  if (refreshTarget === 'plaza') {
    await queryClient.invalidateQueries({
      queryKey: getListActorCollectionsQueryKey(),
    });
    return;
  }

  await queryClient.invalidateQueries({
    queryKey: getActorPublicDetailQueryKey(actorId),
  });
}

function readActorMintCountFromDigest(
  quantity: number | undefined,
  fallback = 1,
): number {
  if (quantity === undefined || quantity === null) {
    return fallback;
  }

  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
    throw new Error('角色签约数量无效，请刷新后重试');
  }

  return quantity;
}

export function ActorMintDialogs({
  actor,
  availableMint,
  active,
  onInactive,
  refreshTarget,
  onMintSuccess,
}: ActorMintDialogsProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { isEmbeddedLogin, solanaAddress } = useAppPrivyAccount();
  const walletUsdcBalance = useGlobalStore((state) => state.walletUsdcBalance);
  const { notifyInsufficientUsdc } = useNotifyInsufficientUsdc();
  const { chainlinks } = useConfigStore();
  const { executeMintActorNftOnChain, isReady: isMintOnChainReady } =
    useMintActorNftOnChain();
  const { executeSponsorMintActorNft, isReady: isSponsorMintReady } =
    useSponsorMintActorNft();

  const [step, setStep] = useState(ActorMintDialogStep.Closed);
  const [isMintPending, setIsMintPending] = useState(false);
  const [mintQuantity, setMintQuantity] = useState(1);

  const viewModel = useMemo((): ActorMintDialogViewModel | null => {
    if (!actor) {
      return null;
    }

    return getActorMintDialogViewModel(actor, { availableMint });
  }, [actor, availableMint]);

  const mintRequestBody = useMemo((): MintActorNftRequest | null => {
    if (!viewModel || !solanaAddress) {
      return null;
    }

    const nftContractAddress =
      viewModel.nftContractAddress?.trim() ||
      actor?.nftMintAddress?.trim() ||
      '';
    const payTokenEnv = import.meta.env.VITE_PAY_TOKEN?.toLowerCase();
    const payToken =
      payTokenEnv === 'usdc'
        ? MintActorNftRequestPayMethod.usdc
        : payTokenEnv === 'usdt'
          ? MintActorNftRequestPayMethod.usdt
          : MintActorNftRequestPayMethod.point;

    return {
      // mint digest 按当前 Solana 钱包签发，与链上 creator 一致
      walletAddress: solanaAddress,
      nftChain: getCurrentChain(),
      nftTokenStandard: 'NFT',
      nftContractAddress,
      payMethod: payToken,
    };
  }, [actor, solanaAddress, viewModel]);

  const signPrice = viewModel?.currentPriceUsdc;
  const isSignPriceInsufficient =
    signPrice !== undefined &&
    signPrice > 0 &&
    (walletUsdcBalance === undefined ||
      !isGreaterThanOrEqual(walletUsdcBalance, signPrice));

  const confirmDisabled =
    isMintPending || mintQuantity < 1 || isSignPriceInsufficient;

  useEffect(() => {
    if (active) {
      setMintQuantity(1);
      setStep(ActorMintDialogStep.Confirm);
    }
  }, [active]);

  const handleConfirmOpenChange = (open: boolean) => {
    if (!open) {
      setStep(ActorMintDialogStep.Closed);
      onInactive();
    }
  };

  const handleSuccessOpenChange = (open: boolean) => {
    if (!open) {
      setStep(ActorMintDialogStep.Closed);
      onInactive();
    }
  };

  const handleCancel = () => {
    setStep(ActorMintDialogStep.Closed);
    onInactive();
  };

  const handleConfirmMint = async () => {
    console.log('[ActorMintDialogs] confirm.clicked', {
      hasViewModel: Boolean(viewModel),
      hasMintRequestBody: Boolean(mintRequestBody),
      confirmDisabled,
      mintQuantity,
      actorId: viewModel?.actorId,
      nftContractAddress: mintRequestBody?.nftContractAddress,
    });

    if (!viewModel || !mintRequestBody) {
      return;
    }

    const actorData = actor as ActorCollectionResponse | null;
    const actorId = readSnowflakeId(viewModel.actorId) || viewModel.actorId;
    if (!actorId) {
      toast.error(t('角色 ID 无效，请刷新后重试'));
      return;
    }
    if (!actorData) {
      toast.error(t('角色数据为空，请刷新后重试'));
      return;
    }
    if (isSignPriceInsufficient) {
      notifyInsufficientUsdc(minus(signPrice ?? 0, walletUsdcBalance ?? 0));
      return;
    }
    if (!solanaAddress) {
      toast.error(t('请先连接 Solana 钱包'));
      return;
    }

    const useSponsor = isEmbeddedLogin;
    if (useSponsor) {
      if (!isSponsorMintReady) {
        toast.error(t('网络不稳定，请稍后重试'));
        return;
      }
    } else if (!isMintOnChainReady) {
      toast.error(t('请先连接 Solana 钱包'));
      return;
    }

    const onChainContext = resolveMintActorOnChainContext(chainlinks);
    if (!onChainContext) {
      const missingFields = getMintActorOnChainContextMissingFields(chainlinks);
      console.error('[ActorMintDialogs] nft.onChainContext.missing', {
        missingFields,
      });
      toast.error(t('角色铸造链上配置不完整，请稍后重试'));
      return;
    }

    setIsMintPending(true);
    try {
      const requestCollectionMintAddress =
        await resolveCreateActorCollectionMintAddress({
          storyProgramId: onChainContext.storyProgramId,
          assetId: actorId,
        });
      const coreMintRequestBody = {
        ...mintRequestBody,
        nftContractAddress: requestCollectionMintAddress,
      };

      console.log('[ActorMintDialogs] mint.api.request', {
        method: 'POST',
        url: `/api/mini-drama/user/actor-collections/${actorId}/nft/mint`,
        actorCollectionId: actorId,
        backendCollectionMintAddress: mintRequestBody.nftContractAddress,
        coreCollectionMintAddress: requestCollectionMintAddress,
        body: coreMintRequestBody,
      });
      const res = await mintActorNft(
        actorId as unknown as number,
        coreMintRequestBody,
      );
      console.log('[ActorMintDialogs] mint.api.response', {
        method: 'POST',
        url: `/api/mini-drama/user/actor-collections/${actorId}/nft/mint`,
        actorCollectionId: actorId,
        status: res.status,
        data: res.data,
      });
      const digest = extractMintDigestBody(res);
      if (!digest) {
        throw new Error(t('铸造摘要为空'));
      }

      const payTokenMint = resolveActorPayTokenMint(
        chainlinks,
        onChainContext.chain,
        mintRequestBody.payMethod,
      );
      if (!payTokenMint) {
        toast.error(t('支付代币配置缺失，请稍后重试'));
        return;
      }

      const canonicalPayload = digest.canonicalPayload?.trim();
      if (!canonicalPayload) {
        throw new Error(t('后端未返回 canonicalPayload'));
      }
      const collectionAssetId = resolveActorCollectionAssetId({
        digest,
        actor: actorData,
        collectionAssetId: actorId,
      });
      const collectionMint = (await resolveCreateActorCollectionMintAddress({
        storyProgramId: onChainContext.storyProgramId,
        assetId: collectionAssetId,
      })) as Address;
      console.log('[ActorMintDialogs] mint.collection.resolved', {
        actorCollectionId: collectionAssetId,
        backendCollectionMintAddress: digest.collectionMintAddress?.trim(),
        coreCollectionMintAddress: collectionMint,
      });
      const resolvedMintCount = readActorMintCountFromDigest(digest.quantity);

      const mintParams = {
        digest,
        actor: actorData,
        canonicalPayload,
        payTokenMint,
        rpcEndpoint: onChainContext.rpcEndpoint,
        storyProgramId: onChainContext.storyProgramId,
        collectionMint,
        collectionAssetId,
        mintCount: resolvedMintCount,
        feeAmount: readActorDigestFeeAmount(digest),
        delegator: onChainContext.delegator,
        treasury: onChainContext.treasury,
        explorer: onChainContext.explorer,
      };

      await (useSponsor
        ? executeSponsorMintActorNft(mintParams)
        : executeMintActorNftOnChain(mintParams));

      await invalidateAfterActorMintSuccess(
        queryClient,
        actorId,
        refreshTarget,
      );
      await onMintSuccess?.();

      void refreshOnChainWalletBalances();

      setStep(ActorMintDialogStep.Success);
    } catch (error) {
      if (
        notifyDirectWalletSimulationError(error, {
          t,
          logPrefix: '[ActorMintDialogs] mint',
          enabled: !useSponsor,
          fallbackToastKey: '铸造失败，请稍后重试',
        })
      ) {
        return;
      }

      toast.error(
        getSponsorSubmitErrorMessage(error, t, '铸造失败，请稍后重试'),
      );
    } finally {
      setIsMintPending(false);
    }
  };

  const handleSuccessConfirm = () => {
    setStep(ActorMintDialogStep.Closed);
    onInactive();
  };
  const actorIpValue = viewModel?.actorId ?? '';

  return (
    <>
      <ActorSignDialog
        open={step === ActorMintDialogStep.Confirm}
        onOpenChange={handleConfirmOpenChange}
        actor={actor}
        actorName={viewModel?.name ?? '-'}
        nftIdLabel={t('角色 IP {{code}}', {
          code: formatActorIpDisplay(actorIpValue),
        })}
        nftIdValue={actorIpValue}
        imageUrl={viewModel?.imageUrl}
        currentPrice={viewModel?.currentPriceUsdc ?? 0}
        mintedSupply={viewModel?.mintedSupply ?? 0}
        initialPrice={viewModel?.initialPriceUsdc ?? 0}
        totalSupply={viewModel?.totalSupply ?? 0}
        pricingMode={viewModel?.pricingMode ?? 'BONDING_CURVE'}
        pricingModeLabel={viewModel?.pricingModeLabel ?? t('曲线价格')}
        remainingCount={viewModel?.availableMint ?? 0}
        quantity={mintQuantity}
        onQuantityChange={setMintQuantity}
        onCancel={handleCancel}
        onConfirm={handleConfirmMint}
        isPending={isMintPending}
        confirmDisabled={confirmDisabled}
      />
      <MintActorNftSuccessDialog
        open={step === ActorMintDialogStep.Success}
        onOpenChange={handleSuccessOpenChange}
        actorName={viewModel?.name ?? '-'}
        nftIdLabel={viewModel?.nftSeriesLabel ?? '-'}
        onConfirm={handleSuccessConfirm}
      />
    </>
  );
}
