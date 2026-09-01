import type { ActorDTO } from '@/api/__generated__/mining/model/actorDTO';
import { GAME_DEPLOY_SLOT_COUNT } from '@/features/game/constants/gameConstants';
import {
  GameDeployedActorStaminaVisualState,
  resolveGameDeployedActorStaminaVisualState,
} from '@/features/game/constants/gameDeployedActorStaminaVisual';
import { cn } from '@/utils';

type DeploySlot = ActorDTO | null;

type GameDeploySlotDotsProps = {
  slots: DeploySlot[];
  /** 当前聚焦槽位；选中点外围描边（浅色黑 / 深色白） */
  activeIndex?: number;
  staminaLimit?: number;
  onSelect?: (index: number) => void;
};

function getSlotDotClassName(
  slot: DeploySlot,
  staminaLimit: number | undefined,
): string {
  if (slot === null) {
    // Figma 119:124922 — Colors/Page&Sheet/unavailable
    return 'bg-game-deploy-slot-dot-empty';
  }

  const visualState = resolveGameDeployedActorStaminaVisualState(
    slot.stamina,
    staminaLimit,
  );

  // Figma 119:124916 — success / warning / error
  if (visualState === GameDeployedActorStaminaVisualState.Exhausted) {
    return 'bg-game-panel-dot-error';
  }

  if (visualState === GameDeployedActorStaminaVisualState.Low) {
    return 'bg-game-upgrade-fee';
  }

  return 'bg-game-panel-dot-success';
}

export function GameDeploySlotDots({
  slots,
  activeIndex,
  staminaLimit,
  onSelect,
}: GameDeploySlotDotsProps) {
  const displaySlots =
    slots.length >= GAME_DEPLOY_SLOT_COUNT
      ? slots.slice(0, GAME_DEPLOY_SLOT_COUNT)
      : [
          ...slots,
          ...Array.from(
            { length: GAME_DEPLOY_SLOT_COUNT - slots.length },
            () => null,
          ),
        ];

  return (
    <ul className="flex list-none items-center gap-1.5 p-0" aria-hidden>
      {displaySlots.map((slot, index) => {
        const isActive = activeIndex === index;

        return (
          <li
            key={slot?.actorNftId ?? `dot-${index}`}
            // Figma 119:124919 — 8px 菱形外接正方形 ≈ 11.314
            className="flex size-[11.314px] items-center justify-center"
          >
            <button
              type="button"
              tabIndex={onSelect ? 0 : -1}
              className={cn(
                // Layout
                'block size-2 shrink-0 -rotate-45 rounded-[2px] border border-solid p-0 leading-none',
                // Visual
                getSlotDotClassName(slot, staminaLimit),
                // State — 选中态外围描边
                isActive ? 'border-foreground' : 'border-transparent',
                onSelect && 'cursor-pointer',
              )}
              onClick={() => onSelect?.(index)}
            />
          </li>
        );
      })}
    </ul>
  );
}
