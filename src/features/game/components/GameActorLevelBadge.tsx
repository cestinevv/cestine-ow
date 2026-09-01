import type { KeyboardEvent, MouseEvent } from 'react';

import { getGameActorLevelBadgeSurfaceClass } from '@/features/game/constants/gameActorLevelVisual';
import { cn } from '@/utils';

type GameActorLevelBadgeProps = {
  level: number | undefined;
  className?: string;
  /** 覆盖等级默认背景，如派遣卡低体力警示 */
  surfaceClassName?: string;
  onClick?: (event: MouseEvent<HTMLElement>) => void;
};

export function GameActorLevelBadge({
  level,
  className,
  surfaceClassName,
  onClick,
}: GameActorLevelBadgeProps) {
  if (level === undefined) {
    return null;
  }

  const isInteractive = Boolean(onClick);
  const surfaceClass =
    surfaceClassName ?? getGameActorLevelBadgeSurfaceClass(level);

  const badgeClassName = cn(
    'rounded-full px-2 py-1 text-xs leading-4 font-medium text-white',
    isInteractive && 'cursor-pointer',
    surfaceClass,
    className,
  );

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!onClick) {
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick(event as unknown as MouseEvent<HTMLElement>);
    }
  };

  if (isInteractive) {
    return (
      // biome-ignore lint/a11y/useSemanticElements: 等级角标需保持 pill 叠层视觉
      <span
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={handleKeyDown}
        className={badgeClassName}
      >
        Lv{level}
      </span>
    );
  }

  return <span className={badgeClassName}>Lv{level}</span>;
}
