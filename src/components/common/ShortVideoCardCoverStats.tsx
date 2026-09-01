import type { ReactNode } from 'react';

import IconHeart12 from '@/assets/svg/IconHeart12';
import { formatPlayCompactCount } from '@/features/play/playFormat';
import { cn } from '@/utils';
import { formatDurationFromSeconds } from '@/utils/formatDuration';

type ShortVideoCardCoverStatsProps = {
  likeCount?: number;
  durationSec?: number;
  /** 创作管理：底部一行左统计右时长；个人中心：右上时长 + 左下统计 */
  layout?: 'creation' | 'profile';
  className?: string;
};

function ShortVideoCardStatItem({
  icon,
  label,
}: {
  icon: ReactNode;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-0.5 text-sm leading-5 text-white">
      {icon}
      {label}
    </span>
  );
}

export function ShortVideoCardCoverStats({
  likeCount,
  durationSec,
  layout = 'creation',
  className,
}: ShortVideoCardCoverStatsProps) {
  const likeLabel = formatPlayCompactCount(likeCount ?? 0);
  const durationLabel =
    durationSec !== undefined
      ? formatDurationFromSeconds(durationSec)
      : undefined;

  const statsRow = (
    <div className="flex items-center gap-4">
      <ShortVideoCardStatItem
        icon={
          <IconHeart12 aria-hidden className="size-3 shrink-0 text-white" />
        }
        label={likeLabel ?? '0'}
      />
    </div>
  );

  if (layout === 'profile') {
    return (
      <div className={cn('absolute inset-0', className)}>
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-linear-to-b from-transparent to-black/60"
          aria-hidden
        />
        <div className="relative flex size-full flex-col justify-between p-3">
          {durationLabel ? (
            <p className="text-right text-sm leading-5 text-white">
              {durationLabel}
            </p>
          ) : (
            <span aria-hidden />
          )}
          {statsRow}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('absolute inset-0', className)}>
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-linear-to-b from-transparent to-black/60"
        aria-hidden
      />
      <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-2">
        {statsRow}
        {durationLabel ? (
          <span className="shrink-0 text-sm leading-5 text-white">
            {durationLabel}
          </span>
        ) : null}
      </div>
    </div>
  );
}
