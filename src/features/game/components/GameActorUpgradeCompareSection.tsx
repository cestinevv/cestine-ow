import { useTranslation } from 'react-i18next';

import IconChevronRight from '@/assets/svg/IconChevronRight';
import { getGameActorLevelBadgeSurfaceClass } from '@/features/game/constants/gameActorLevelVisual';
import { formatGameActorHourlyPaymentValue } from '@/features/game/formatGameActorStoryRate';
import { cn } from '@/utils';

type GameActorUpgradeCompareSectionProps = {
  fromLevel?: number;
  toLevel?: number;
  currentStoryRate?: number;
  nextStoryRate?: number;
};

/** Figma 198:44099 / 191:43793 — Lv 胶囊 + 片酬对比条（page&sheet/thirdly） */
export function GameActorUpgradeCompareSection({
  fromLevel,
  toLevel,
  currentStoryRate,
  nextStoryRate,
}: GameActorUpgradeCompareSectionProps) {
  const { t } = useTranslation();

  const toLevelSurfaceClass =
    toLevel !== undefined
      ? getGameActorLevelBadgeSurfaceClass(toLevel)
      : undefined;

  return (
    <div
      className={cn(
        'flex w-full flex-col items-center gap-2',
        'rounded-lg px-3 py-2',
        'bg-game-upgrade-compare-surface',
      )}
    >
      <div className="flex items-center justify-center gap-2">
        {fromLevel !== undefined ? (
          <span
            className={cn(
              'rounded-full py-0.5 pr-1.5 pl-2',
              'bg-button-disabled-surface',
              'text-xs leading-4 font-medium tracking-[0.04px] text-white',
            )}
          >
            Lv{fromLevel}
          </span>
        ) : null}
        <IconChevronRight
          className="size-4 shrink-0 text-foreground"
          aria-hidden
        />
        {toLevel !== undefined ? (
          <span
            className={cn(
              'rounded-full py-0.5 pr-1.5 pl-2',
              'text-xs leading-4 font-medium tracking-[0.04px] text-white',
              toLevelSurfaceClass,
            )}
          >
            Lv{toLevel}
          </span>
        ) : null}
      </div>

      <p className="flex min-w-0 flex-wrap items-baseline justify-center gap-x-1 whitespace-nowrap">
        <span className="text-sm leading-5 font-normal text-muted-foreground">
          {t('片酬')}
        </span>
        <span className="text-sm leading-5 font-bold text-foreground">
          {formatGameActorHourlyPaymentValue(currentStoryRate)}
          {' → '}
          {formatGameActorHourlyPaymentValue(nextStoryRate)}
        </span>
        <span className="text-xs leading-4 font-normal tracking-[0.04px] text-muted-foreground">
          STORY/h
        </span>
      </p>
    </div>
  );
}
