/**
 * 叙述者中心 — 「短剧管理」Tab 面板。
 * 备注：短剧卡列表、审核筛选（全部/已通过/审核中/未通过）；铸造短剧 NFT、铸造成功、删除短剧（creator 接口联调）。
 */
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useInView } from 'react-intersection-observer';
import { toast } from 'sonner';
import { useDeleteDrama } from '@/api/__generated__/story/create-drama/create-drama';
import { getGetCreatorStatsQueryKey } from '@/api/__generated__/story/create-stats/create-stats';
import type { DramaDetailResponse } from '@/api/__generated__/story/model/dramaDetailResponse';
import { AppDialog } from '@/components/common/AppDialog';
import AppLoadingContainer from '@/components/common/AppLoadingContainer';
import { FilterTabs } from '@/components/common/Tabs';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
  buildExplorerTxUrl,
  getChainExplorer,
} from '@/hooks/solana/chainRpcConfig';
import { getCurrentChain } from '@/solana/chainConfig';
import { useConfigStore } from '@/stores/config';
import useGlobalStore from '@/stores/global';
import { cn, toNumber } from '@/utils';
import { readSnowflakeId } from '@/utils/snowflakeId';

import { NARRATOR_CARD_GRID_CLASS } from '../constants/narratorCardGrid';
import {
  NARRATOR_REVIEW_FILTERS,
  NarratorReviewFilter,
} from '../constants/narratorManagementTabs';
import { useNarratorCreatorDramaList } from '../hooks/useNarratorCreatorDramaList';
import {
  CREATOR_DRAMA_LIST_QUERY_KEY_PREFIX,
  DRAMA_NFT_POSITIONS_QUERY_KEY_PREFIX,
} from '../narratorCreatorDramaFormat';

import { DeleteDramaConfirmDialog } from './DeleteDramaConfirmDialog';
import { DramaManagementCard } from './DramaManagementCard';
import {
  MintDramaNftDialog,
  type MintDramaNftSuccessResult,
} from './MintDramaNftDialog';

/** 短剧管理相关弹窗（同时仅展示一种）。 */
enum DramaDialogKind {
  Closed = 'closed',
  Mint = 'mint',
  MintSuccess = 'mint_success',
  DeleteConfirm = 'delete_confirm',
}

export function DramaManagementPanel() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { chainlinks } = useConfigStore();
  const profileUserId = useGlobalStore((state) => state.userProfile?.userId);
  const creatorStatsUserId = profileUserId
    ? toNumber(profileUserId)
    : Number.NaN;
  const { ref: loadMoreRef, inView } = useInView();

  const [currentFilter, setCurrentFilter] = useState<NarratorReviewFilter>(
    NarratorReviewFilter.All,
  );
  const [dialogKind, setDialogKind] = useState<DramaDialogKind>(
    DramaDialogKind.Closed,
  );
  const [activeDrama, setActiveDrama] = useState<DramaDetailResponse | null>(
    null,
  );
  const [lastMintTxHash, setLastMintTxHash] = useState<string | null>(null);
  const [lastMintAddress, setLastMintAddress] = useState<string | null>(null);
  const skipMintCloseResetRef = useRef(false);

  const {
    dramaRows,
    isPending: isListLoading,
    isError: isListError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useNarratorCreatorDramaList(currentFilter);

  const deleteMutation = useDeleteDrama();

  const activeDramaForDialog = useMemo(() => {
    const activeDramaId = readSnowflakeId(activeDrama?.id);
    if (!activeDramaId) {
      return activeDrama;
    }

    return (
      dramaRows.find((row) => readSnowflakeId(row.id) === activeDramaId) ??
      activeDrama
    );
  }, [activeDrama, dramaRows]);

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  /** 铸造 / 删除成功后：失效短剧列表与概览数量缓存（活跃查询各 refetch 一次）。 */
  const refreshDramaList = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: [CREATOR_DRAMA_LIST_QUERY_KEY_PREFIX],
      }),
      queryClient.invalidateQueries({
        queryKey: getGetCreatorStatsQueryKey(creatorStatsUserId),
      }),
      queryClient.invalidateQueries({
        queryKey: [DRAMA_NFT_POSITIONS_QUERY_KEY_PREFIX],
      }),
    ]);
  };

  // 用户点击卡片上的「铸造短剧NFT」：打开对应短剧的铸造确认弹窗。
  const handleOpenMintDialog = (drama: DramaDetailResponse) => () => {
    setActiveDrama(drama);
    setDialogKind(DramaDialogKind.Mint);
  };

  // 用户点击卡片上的「删除」/「删除短剧」：打开删除二次确认弹窗。
  const handleOpenDeleteDialog = (drama: DramaDetailResponse) => () => {
    setActiveDrama(drama);
    setDialogKind(DramaDialogKind.DeleteConfirm);
  };

  // 铸造成功：切换成功弹窗并保留当前短剧上下文
  const handleMintSuccess = async (result: MintDramaNftSuccessResult) => {
    setLastMintTxHash(result.txHash);
    setLastMintAddress(result.mintAddress);
    skipMintCloseResetRef.current = true;
    setDialogKind(DramaDialogKind.MintSuccess);
  };

  // 铸造弹窗受控关闭：若因切成功弹窗触发则不清空 activeDrama，否则复位。
  const handleMintDialogOpenChange = (open: boolean) => {
    if (!open) {
      if (skipMintCloseResetRef.current) {
        skipMintCloseResetRef.current = false;
        return;
      }

      setDialogKind(DramaDialogKind.Closed);
      setActiveDrama(null);
      setLastMintTxHash(null);
      setLastMintAddress(null);
    }
  };

  // 成功弹窗关闭：清空上下文。
  const handleMintSuccessOpenChange = (open: boolean) => {
    if (!open) {
      setDialogKind(DramaDialogKind.Closed);
      setActiveDrama(null);
      setLastMintTxHash(null);
      setLastMintAddress(null);
    }
  };

  // 成功弹窗内点击「确认」：关闭。
  const handleMintSuccessConfirm = () => {
    setDialogKind(DramaDialogKind.Closed);
    setActiveDrama(null);
    setLastMintTxHash(null);
    setLastMintAddress(null);
  };

  // 删除确认弹窗关闭：删除请求进行中时不关闭；否则清空上下文。
  const handleDeleteDialogOpenChange = (open: boolean) => {
    if (!open && deleteMutation.isPending) {
      return;
    }

    if (!open) {
      setDialogKind(DramaDialogKind.Closed);
      setActiveDrama(null);
    }
  };

  // 删除确认内确定：调用 deleteDrama 成功后刷新短剧列表。
  const handleDeleteConfirm = async () => {
    if (!activeDrama?.id) {
      return;
    }

    try {
      const res = await deleteMutation.mutateAsync({ dramaId: activeDrama.id });
      if (res.status !== 200) {
        return;
      }

      toast.success(t('删除成功'));
      setDialogKind(DramaDialogKind.Closed);
      setActiveDrama(null);
      await refreshDramaList();
    } catch {
      // 错误已由 appRequest toast
    }
  };

  const isMintOpen = dialogKind === DramaDialogKind.Mint;
  const isMintSuccessOpen = dialogKind === DramaDialogKind.MintSuccess;
  const isDeleteOpen = dialogKind === DramaDialogKind.DeleteConfirm;

  const mintNftIdDisplay = lastMintAddress?.trim() || '-';
  const mintTxHashDisplay = lastMintTxHash?.trim() || '';
  const chainExplorer = getChainExplorer(chainlinks, getCurrentChain());
  const mintTxExplorerHref = mintTxHashDisplay
    ? buildExplorerTxUrl(chainExplorer, mintTxHashDisplay)
    : undefined;

  return (
    <div className="flex w-full flex-col gap-4 md:gap-6">
      <FilterTabs
        items={NARRATOR_REVIEW_FILTERS}
        value={currentFilter}
        onValueChange={(value) =>
          setCurrentFilter(value as NarratorReviewFilter)
        }
        t={t}
      />

      <AppLoadingContainer
        data={dramaRows}
        isLoading={isListLoading}
        isError={isListError}
        minHeight={280}
        emptyDescription={t('暂无短剧')}
        scrollable={false}
      >
        <section className={NARRATOR_CARD_GRID_CLASS}>
          {dramaRows.map((drama) => {
            const idKey = drama.id !== undefined ? String(drama.id) : '';

            return (
              <DramaManagementCard
                key={idKey}
                drama={drama}
                mintDisabled={isMintOpen}
                deleteDisabled={deleteMutation.isPending}
                onMint={handleOpenMintDialog(drama)}
                onDelete={handleOpenDeleteDialog(drama)}
              />
            );
          })}
        </section>
      </AppLoadingContainer>

      {hasNextPage ? (
        <div
          ref={loadMoreRef}
          className="flex min-h-12 w-full items-center justify-center"
        >
          {isFetchingNextPage ? <Spinner className="size-6" /> : null}
        </div>
      ) : null}

      <MintDramaNftDialog
        open={isMintOpen}
        onOpenChange={handleMintDialogOpenChange}
        drama={activeDramaForDialog}
        onMintSuccess={handleMintSuccess}
      />

      <AppDialog
        open={isMintSuccessOpen}
        onOpenChange={handleMintSuccessOpenChange}
        title={<span className="sr-only">{t('铸造成功！')}</span>}
        width={424}
      >
        {activeDramaForDialog ? (
          <div
            className={cn(
              'flex flex-col items-center',
              'gap-2 pb-0',
              'text-center',
            )}
          >
            <div
              className={cn(
                'flex size-11 shrink-0 items-center justify-center rounded-full',
                'bg-emerald-500',
                'text-lg font-bold text-white',
              )}
              aria-hidden
            >
              ✓
            </div>
            <p className="text-base leading-6 font-bold text-foreground">
              {t('铸造成功！')}
            </p>
            <p className="text-sm leading-5 font-medium text-foreground">
              {t('《{{dramaTitle}}》短剧NFT已上链', {
                dramaTitle: activeDramaForDialog.title?.trim() || '-',
              })}
            </p>
            <p className="text-sm leading-5 text-muted-foreground">
              {t('NFT编号：{{nftId}}', { nftId: mintNftIdDisplay })}
            </p>
            {mintTxHashDisplay ? (
              <p className="text-sm leading-5 text-muted-foreground">
                {mintTxExplorerHref ? (
                  <>
                    {t('交易哈希：')}
                    <a
                      href={mintTxExplorerHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="break-all text-primary underline-offset-2 hover:underline"
                    >
                      {mintTxHashDisplay}
                    </a>
                  </>
                ) : (
                  t('交易哈希：{{txHash}}', { txHash: mintTxHashDisplay })
                )}
              </p>
            ) : null}
            <Button
              type="button"
              variant="default"
              className={cn(
                'mt-6 h-auto min-h-10 w-full rounded-full',
                'bg-foreground px-4 py-2.5',
                'text-sm leading-5 font-bold text-background hover:bg-foreground/90',
              )}
              onClick={handleMintSuccessConfirm}
            >
              {t('确认')}
            </Button>
          </div>
        ) : null}
      </AppDialog>

      <DeleteDramaConfirmDialog
        open={isDeleteOpen}
        onOpenChange={handleDeleteDialogOpenChange}
        onConfirmDelete={handleDeleteConfirm}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
}
