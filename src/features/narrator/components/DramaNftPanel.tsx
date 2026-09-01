/**
 * 叙述者中心 — 「短剧 NFT」Tab 面板。
 * 备注：使用 GET /api/userWallet/dramaNft/positions 游标分页展示个人短剧 NFT 持仓。
 */
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useInView } from 'react-intersection-observer';

import AppLoadingContainer from '@/components/common/AppLoadingContainer';
import { Spinner } from '@/components/ui/spinner';
import { readSnowflakeId } from '@/utils/snowflakeId';

import { NARRATOR_CARD_GRID_CLASS } from '../constants/narratorCardGrid';
import { useNarratorDramaNftPositionsList } from '../hooks/useNarratorDramaNftPositionsList';
import { DramaNftCard } from './DramaNftCard';

export function DramaNftPanel() {
  const { t } = useTranslation();
  const { ref: loadMoreRef, inView } = useInView();

  const {
    positionRows,
    isPending: isListLoading,
    isError: isListError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useNarratorDramaNftPositionsList();

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div className="flex w-full flex-col gap-4 md:gap-6">
      <AppLoadingContainer
        data={positionRows}
        isLoading={isListLoading}
        isError={isListError}
        minHeight={280}
        emptyDescription={t('暂无短剧NFT')}
        scrollable={false}
      >
        <section className={NARRATOR_CARD_GRID_CLASS}>
          {positionRows.map((position) => {
            const dramaId = readSnowflakeId(position.dramaId) ?? '';
            const nftAddress = position.nftContractAddress?.trim() ?? '';
            const idKey = dramaId || nftAddress || position.createdAt || '';

            return <DramaNftCard key={idKey} position={position} />;
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
    </div>
  );
}
