import { formatGameActorHourlyPaymentValue } from '@/features/game/formatGameActorStoryRate';
import { cn } from '@/utils';

/** Figma 119:123300 — 可点击片酬：数值 Medium + STORY/h 点状下划线 */
export const GAME_ACTOR_STORY_RATE_BUTTON_CLASS = cn(
  'inline-flex max-w-full cursor-pointer items-baseline gap-0.5 whitespace-nowrap',
  'rounded-sm transition-colors hover:bg-muted/60',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
);

export const GAME_ACTOR_STORY_RATE_UNIT_CLASS = cn(
  'text-xs leading-4 font-normal tracking-[0.04px]',
  'underline decoration-dotted decoration-[10%]',
  '[text-decoration-skip-ink:none] [text-underline-position:from-font]',
);

type GameActorStoryRateButtonProps = {
  rateValue: number | undefined;
  ariaLabel: string;
  onClick: () => void;
  variant?: 'default' | 'panel';
  className?: string;
};

export function GameActorStoryRateButton({
  rateValue,
  ariaLabel,
  onClick,
  variant = 'default',
  className,
}: GameActorStoryRateButtonProps) {
  const valueClassName =
    variant === 'panel'
      ? 'text-sm leading-5 font-medium text-game-header-title'
      : 'text-sm leading-5 font-medium text-foreground';

  const unitClassName =
    variant === 'panel'
      ? cn(GAME_ACTOR_STORY_RATE_UNIT_CLASS, 'text-game-header-subtitle')
      : cn(GAME_ACTOR_STORY_RATE_UNIT_CLASS, 'text-muted-foreground');

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className={cn(GAME_ACTOR_STORY_RATE_BUTTON_CLASS, className)}
    >
      <span className={valueClassName}>
        {formatGameActorHourlyPaymentValue(rateValue)}
      </span>
      <span className={unitClassName}>STORY/h</span>
    </button>
  );
}
