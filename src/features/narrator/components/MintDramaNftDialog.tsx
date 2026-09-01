/**
 * 叙述者中心 — 「铸造短剧 NFT」确认弹窗。
 * 备注：从短剧管理入口打开；展示短剧摘要、组装 mint 请求并完成链上/代付铸造。
 */
import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import type { DramaDetailResponse } from '@/api/__generated__/story/model/dramaDetailResponse';
import { MintDramaNftRequestPayMethod } from '@/api/__generated__/story/model/mintDramaNftRequestPayMethod';
import coverImage from '@/assets/image/index/showcase-still-01.png';
import { AppDialog } from '@/components/common/AppDialog';
import {
  APP_DIALOG_PRIMARY_BUTTON_CLASS,
  APP_DIALOG_SECONDARY_BUTTON_CLASS,
} from '@/components/common/appDialogButton';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { getStoryProgramId } from '@/hooks/solana/chainRpcConfig';
import { notifyDirectWalletSimulationError } from '@/hooks/solana/directWallet';
import { mintDramaNftById } from '@/hooks/solana/dramaMint/mintDramaNftApi';
import { resolveStoryPayTokenMint } from '@/hooks/solana/resolveStoryPayTokenMint';
import {
  buildMintDramaCanonicalPayloadFromContext,
  getMintDramaOnChainContextMissingFields,
  resolveMintDramaOnChainContext,
  useMintDramaNftOnChain,
} from '@/hooks/solana/useMintDramaNftOnChain';
import { extractMintDigestBody } from '@/hooks/sponsor/dramaMint/extractMintDigestBody';
import { useSponsorMintDramaNft } from '@/hooks/sponsor/dramaMint/useSponsorMintDramaNft';
import { getSponsorSubmitErrorMessage } from '@/hooks/sponsor/sponsorSubmitResult';
import { useAppPrivyAccount } from '@/hooks/useAppPrivyAccount';
import { useNotifyInsufficientUsdc } from '@/hooks/useNotifyInsufficientUsdc';
import { getCurrentChain } from '@/solana/chainConfig';
import { useConfigStore } from '@/stores/config';
import useGlobalStore from '@/stores/global';
import { cn, isGreaterThanOrEqual, minus } from '@/utils';
import { readSnowflakeId } from '@/utils/snowflakeId';

import {
  CREATOR_DRAMA_LIST_QUERY_KEY_PREFIX,
  DRAMA_NFT_POSITIONS_QUERY_KEY_PREFIX,
} from '../narratorCreatorDramaFormat';

function getConfiguredDramaMintPayToken() {
  const payTokenEnv = import.meta.env.VITE_PAY_TOKEN?.toLowerCase();

  if (payTokenEnv === 'usdt') {
    return MintDramaNftRequestPayMethod.usdt;
  }

  if (payTokenEnv === 'point') {
    return MintDramaNftRequestPayMethod.point;
  }

  return MintDramaNftRequestPayMethod.usdc;
}

/** 短剧 NFT 铸造固定手续费（与稿面「1 USDC」一致） */
const DRAMA_MINT_FEE_USDC = '1';

export type MintDramaNftSuccessResult = {
  txHash: string;
  mintAddress: string;
};

export type MintDramaNftDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 短剧数据（用于展示与构建请求） */
  drama: DramaDetailResponse | null;
  /** 铸造成功：由父组件切换成功弹窗等 UI */
  onMintSuccess: (result: MintDramaNftSuccessResult) => void | Promise<void>;
};

export function MintDramaNftDialog({
  open,
  onOpenChange,
  drama,
  onMintSuccess,
}: MintDramaNftDialogProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { isEmbeddedLogin, solanaAddress } = useAppPrivyAccount();
  const { chainlinks } = useConfigStore();
  const walletUsdcBalance = useGlobalStore((state) => state.walletUsdcBalance);
  const { notifyInsufficientUsdc } = useNotifyInsufficientUsdc();
  const { executeMintDramaNftOnChain, isReady: isMintOnChainReady } =
    useMintDramaNftOnChain();
  const { executeSponsorMintDramaNft, isReady: isSponsorMintReady } =
    useSponsorMintDramaNft();

  const [isMintPending, setIsMintPending] = useState(false);

  const dramaTitle = drama?.title?.trim() || '-';
  const coverSrc = drama?.coverUrl?.trim() || coverImage;
  const episodeLabel =
    drama?.totalEpisodes !== undefined
      ? t('共 {{n}} 集', { n: drama.totalEpisodes })
      : t('暂无记录');

  // 构建 mintDramaNft 请求体：链、标准、合约地址从全局配置读取
  const mintRequestBody = useMemo(() => {
    if (!drama || !solanaAddress) return null;

    const currentChain = getCurrentChain();
    const chainInfo = chainlinks?.[currentChain];

    const nftChain = currentChain;
    const nftTokenStandard = 'NFT';
    const nftContractAddress = String(
      getStoryProgramId(chainlinks, currentChain),
    );

    if (!nftContractAddress || !nftChain) {
      console.warn('短剧 NFT 参数不完整', {
        nftContractAddress,
        nftChain,
        chainInfo,
        currentChain,
        storyProgramId: chainInfo?.contracts.story,
      });
      return null;
    }

    return {
      nftChain,
      nftTokenStandard,
      nftContractAddress,
      payMethod: getConfiguredDramaMintPayToken(),
      // mint digest 按当前 Solana 钱包签发，与链上 creator 一致
      walletAddress: solanaAddress ?? '',
    };
  }, [drama, chainlinks, solanaAddress]);

  const confirmDisabled = !mintRequestBody || isMintPending;

  // 铸造成功后：失效短剧管理、概览与短剧 NFT 面板缓存。
  const refreshDramaList = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: [CREATOR_DRAMA_LIST_QUERY_KEY_PREFIX],
      }),
      queryClient.invalidateQueries({
        queryKey: [DRAMA_NFT_POSITIONS_QUERY_KEY_PREFIX],
      }),
    ]);
  };

  // 取消：关闭铸造弹窗
  const handleCancel = () => {
    onOpenChange(false);
  };

  // 确认铸造：mint API → 邮箱登录代付 / 钱包直连链上 mint_series_nft
  const handleConfirmMint = async () => {
    if (!drama || !mintRequestBody) {
      console.error('无法铸造：请求参数不完整');
      return;
    }

    const dramaId = readSnowflakeId(drama.id);
    if (!dramaId) {
      toast.error(t('短剧 ID 无效，请刷新列表后重试'));
      return;
    }

    if (!solanaAddress) {
      toast.error(t('请先连接 Solana 钱包'));
      return;
    }

    if (
      mintRequestBody.payMethod === MintDramaNftRequestPayMethod.usdc &&
      (walletUsdcBalance === undefined ||
        !isGreaterThanOrEqual(walletUsdcBalance, DRAMA_MINT_FEE_USDC))
    ) {
      notifyInsufficientUsdc(
        minus(DRAMA_MINT_FEE_USDC, walletUsdcBalance ?? 0),
      );
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

    const onChainContext = resolveMintDramaOnChainContext(chainlinks);
    if (!onChainContext) {
      const missingFields = getMintDramaOnChainContextMissingFields(chainlinks);
      console.error('[MintDramaNftDialog] mint.onChainContext.missing', {
        missingFields,
      });

      toast.error(t('短剧铸造链上配置不完整，请稍后重试'));
      return;
    }

    const payTokenMint = resolveStoryPayTokenMint(
      chainlinks,
      onChainContext.chain,
      mintRequestBody.payMethod,
    );
    if (!payTokenMint) {
      toast.error(t('支付代币配置缺失，请稍后重试'));
      return;
    }

    setIsMintPending(true);
    try {
      const res = await mintDramaNftById(dramaId, mintRequestBody);
      const digest = extractMintDigestBody(res);
      if (!digest) {
        throw new Error('铸造摘要为空');
      }

      const walletAddress = digest.mintWalletAddress?.trim() || solanaAddress;

      // 优先后端 canonicalPayload，与 Ed25519 签名口径一致
      const canonicalPayload =
        digest.canonicalPayload?.trim() ||
        buildMintDramaCanonicalPayloadFromContext({
          digest,
          drama,
          walletAddress,
        });

      const mintParams = {
        digest,
        drama,
        canonicalPayload,
        rpcEndpoint: onChainContext.rpcEndpoint,
        storyProgramId: onChainContext.storyProgramId,
        delegator: onChainContext.delegator,
        payTokenMint,
        treasury: onChainContext.treasury,
        explorer: onChainContext.explorer,
      };
      const mintResult = useSponsor
        ? await executeSponsorMintDramaNft(mintParams)
        : await executeMintDramaNftOnChain(mintParams);

      await onMintSuccess({
        txHash: mintResult.txHash,
        mintAddress: mintResult.mintAddress,
      });
      await refreshDramaList();
    } catch (error) {
      if (
        notifyDirectWalletSimulationError(error, {
          t,
          logPrefix: '[MintDramaNftDialog] mint',
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

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('铸造短剧NFT')}
      width={424}
    >
      {drama ? (
        <div className={cn('flex flex-col', 'gap-8')}>
          <div
            className={cn('flex flex-row', 'gap-4 rounded-2xl p-4', 'bg-muted')}
          >
            <div className="relative h-[60px] w-20 shrink-0 overflow-hidden rounded-lg">
              <img src={coverSrc} alt="" className="size-full object-cover" />
            </div>
            <div className={cn('flex min-w-0 flex-1 flex-col', 'gap-1.5')}>
              <p
                className="truncate text-base leading-6 font-bold text-foreground"
                title={dramaTitle}
              >
                {dramaTitle}
              </p>
              <p className="text-xs leading-4 tracking-[0.04px] text-muted-foreground">
                {episodeLabel}
              </p>
            </div>
          </div>

          <div
            className={cn(
              'flex w-full items-center justify-between gap-3 rounded-xl',
              'border border-onestory-brand-red/20 bg-onestory-brand-red/5',
              'px-4 py-3 text-play-drama-stat-foreground',
            )}
          >
            <span className="text-[10px] leading-3 tracking-[0.08px]">
              {t('铸造手续费')}
            </span>
            <strong className="text-base leading-6 font-bold">
              {'1 USDC'}
            </strong>
          </div>

          <div className={cn('flex w-full flex-row', 'gap-3')}>
            <Button
              type="button"
              variant="outline"
              disabled={isMintPending}
              onClick={handleCancel}
              className={APP_DIALOG_SECONDARY_BUTTON_CLASS}
            >
              {t('取消')}
            </Button>
            <Button
              type="button"
              disabled={confirmDisabled}
              onClick={handleConfirmMint}
              className={APP_DIALOG_PRIMARY_BUTTON_CLASS}
            >
              {isMintPending ? (
                <span
                  className={cn(
                    'inline-flex items-center justify-center',
                    'gap-2',
                  )}
                >
                  <Spinner className="size-4 text-background" />
                  {t('铸造中...')}
                </span>
              ) : (
                t('确认铸造')
              )}
            </Button>
          </div>
        </div>
      ) : null}
    </AppDialog>
  );
}
