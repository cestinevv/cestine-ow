import { useTranslation } from 'react-i18next';

import type { DramaNftPositionItemResponse } from '@/api/__generated__/wallet/model/dramaNftPositionItemResponse';
import coverImage from '@/assets/image/index/showcase-still-01.png';
import { PLAY_CARD_COVER_ASPECT_CLASS } from '@/features/play/playFormat';
import { cn, toNumber } from '@/utils';
import { readSnowflakeId } from '@/utils/snowflakeId';

type DramaNftCardProps = {
  position: DramaNftPositionItemResponse;
};

function getDramaNftLabel(position: DramaNftPositionItemResponse): string {
  const address = position.nftContractAddress?.trim();
  if (address) {
    return `#NFT-${address.slice(0, 4)}`;
  }

  const dramaId = readSnowflakeId(position.dramaId);
  if (dramaId) {
    return `#NFT-${dramaId.slice(-4)}`;
  }

  return '#NFT';
}

export function DramaNftCard({ position }: DramaNftCardProps) {
  const { t } = useTranslation();
  const title = position.dramaName?.trim() || '-';
  const coverSrc = position.coverUrl?.trim() || coverImage;
  const description = position.description?.trim() || '-';
  const episodeCount = position.episodeCount?.trim();
  const episodeNumber =
    episodeCount !== undefined && episodeCount !== ''
      ? toNumber(episodeCount)
      : undefined;
  const episodeLabel =
    episodeNumber !== undefined && Number.isFinite(episodeNumber)
      ? t('{{count}} 集', { count: episodeNumber })
      : t('暂无记录');

  return (
    <article
      className={cn(
        'flex h-full min-h-0 min-w-0 flex-col overflow-hidden',
        'rounded-xl bg-card',
        'index-shadow-pipeline-hover',
      )}
    >
      <div
        className={cn(
          'relative w-full shrink-0 overflow-hidden rounded-t-xl',
          PLAY_CARD_COVER_ASPECT_CLASS,
        )}
      >
        <img
          src={coverSrc}
          alt={title}
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        />
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 p-4">
        <h3 className="truncate text-base leading-6 font-bold text-foreground">
          {title}
        </h3>
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="inline-flex shrink-0 rounded bg-muted px-2 py-1 text-xs leading-4 tracking-[0.04px] text-foreground">
            {getDramaNftLabel(position)}
          </span>
        </div>
        <p className="truncate text-sm leading-5 tracking-[-0.1504px] text-muted-foreground">
          {episodeLabel} ｜ {description}
        </p>
      </div>
    </article>
  );
}
