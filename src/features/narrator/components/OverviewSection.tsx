/**
 * 叙述者中心 — 页首概览区。
 * 备注：展示创作标题、发布入口、发布短剧数与持有 NFT 数。
 */
import { useNavigate } from '@tanstack/react-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useGetCreatorStats } from '@/api/__generated__/story/create-stats/create-stats';
import { usePositions } from '@/api/__generated__/wallet/userwallet-dramanft/userwallet-dramanft';
import { Button, buttonVariants } from '@/components/ui/button';
import useGlobalStore from '@/stores/global';
import { cn, formatNumber, toNumber } from '@/utils';

import {
  extractDramaNftPositionsTotal,
  extractOnlineDramaCount,
  NARRATOR_DRAMA_NFT_POSITIONS_OVERVIEW_PARAMS,
} from '../narratorCreatorDramaFormat';

const DREAM_OS_URL = 'https://www.dreamos.xyz/';
type MetricCard = {
  titleKey: string;
  mobileTitleKey?: string;
  valueText: string;
};

export function OverviewSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const profileUserId = useGlobalStore((state) => state.userProfile?.userId);
  const creatorStatsUserId = profileUserId
    ? toNumber(profileUserId)
    : Number.NaN;

  const positionsQuery = usePositions(
    NARRATOR_DRAMA_NFT_POSITIONS_OVERVIEW_PARAMS,
    {
      query: { retry: false },
    },
  );
  const onlineDramaCountQuery = useGetCreatorStats(creatorStatsUserId, {
    query: {
      retry: false,
      enabled:
        profileUserId !== undefined && Number.isFinite(creatorStatsUserId),
    },
  });

  const publishedDramaCount = useMemo(
    () => extractOnlineDramaCount(onlineDramaCountQuery.data),
    [onlineDramaCountQuery.data],
  );

  const heldNftCount = useMemo(
    () => extractDramaNftPositionsTotal(positionsQuery.data),
    [positionsQuery.data],
  );

  const metricCards = useMemo((): MetricCard[] => {
    return [
      {
        titleKey: '发布短剧',
        valueText: onlineDramaCountQuery.isPending
          ? '-'
          : formatNumber(publishedDramaCount ?? 0, 0),
      },
      {
        titleKey: '持有NFT数',
        mobileTitleKey: '持有短剧NFT',
        valueText: positionsQuery.isPending
          ? '-'
          : formatNumber(heldNftCount ?? 0, 0),
      },
    ];
  }, [
    heldNftCount,
    onlineDramaCountQuery.isPending,
    positionsQuery.isPending,
    publishedDramaCount,
  ]);

  function handleGoCreateShortDrama() {
    void navigate({ to: '/create' });
  }

  return (
    <section className="flex w-full flex-col gap-4 md:gap-5">
      <header
        className={cn(
          // 与角色 IP 页头同构：标题区 + 右侧 CTA，桌面同高
          'flex w-full shrink-0 flex-col gap-4',
          'md:flex-row md:items-center md:justify-between md:gap-8',
        )}
      >
        <div className="hidden min-w-0 flex-1 flex-col gap-1 md:flex">
          <h1
            className={cn(
              'text-2xl leading-8 font-bold tracking-[-0.12px] text-foreground',
              'md:text-[30px] md:leading-9',
            )}
          >
            {t('创作')}
          </h1>
          <p className="text-sm leading-5 text-muted-foreground md:text-sm md:leading-5">
            {t('短剧的发布、审核与铸造。')}
          </p>
        </div>

        <div
          className={cn(
            'flex w-full shrink-0 items-center gap-4',
            'md:w-auto md:justify-end',
          )}
        >
          <a
            href={DREAM_OS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              buttonVariants({ variant: 'outline', size: 'lg' }),
              'h-11 flex-1 rounded-full px-6 md:flex-none',
              'text-sm leading-5 font-bold text-foreground',
            )}
          >
            {t('创作短剧')}
          </a>
          <Button
            type="button"
            onClick={handleGoCreateShortDrama}
            className={cn(
              // 与「创建角色 IP」CTA 同高：h-11 / px-6 / bold
              'h-11 min-w-0 flex-1 rounded-full px-6 md:w-auto md:flex-none',
              'text-sm leading-5 font-bold',
              // Figma Colors/Text/white to dark：深色青绿底配深色字
              'dark:text-background',
            )}
          >
            <span className="min-w-0 truncate">{t('发布新短剧')}</span>
          </Button>
        </div>
      </header>

      <div className="grid w-full grid-cols-2 gap-3 md:grid-cols-2 md:gap-4">
        {metricCards.map((card) => (
          <article
            key={card.titleKey}
            className={cn(
              'flex min-h-20 flex-col justify-center gap-1',
              'rounded-xl border border-border bg-card p-4',
              'md:min-h-[120px] md:rounded-2xl md:border-0 md:px-6 md:py-5',
            )}
          >
            <p className="text-xs leading-4 tracking-[0.04px] text-muted-foreground md:text-sm md:leading-5 md:tracking-normal">
              <span className="md:hidden">
                {t(card.mobileTitleKey ?? card.titleKey)}
              </span>
              <span className="hidden md:inline">{t(card.titleKey)}</span>
            </p>
            <p
              className={cn(
                'text-lg leading-[26px] font-bold tracking-[-0.04px] text-foreground',
                'md:text-[44px] md:leading-[52px] md:tracking-[-0.12px]',
              )}
            >
              {card.valueText}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
