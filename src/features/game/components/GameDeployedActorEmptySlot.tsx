import { useTranslation } from 'react-i18next';

import IconDeploySlotEmptyAvatar from '@/assets/svg/IconDeploySlotEmptyAvatar';
import { Button } from '@/components/ui/button';
import {
  GAME_DEPLOYED_ACTOR_CARD_CLASS,
  GAME_DEPLOYED_ACTOR_COVER_ASPECT_CLASS,
  GAME_DEPLOYED_ACTOR_SLOT_SIZE_CLASS,
} from '@/features/game/constants/gameConstants';
import { GAME_DEPLOYED_EMPTY_SLOT_CTA_CLASS } from '@/features/game/constants/gameDeployedEmptySlotStyles';
import { cn } from '@/utils';

type GameDeployedActorEmptySlotProps = {
  onClick: () => void;
};

export function GameDeployedActorEmptySlot({
  onClick,
}: GameDeployedActorEmptySlotProps) {
  const { t } = useTranslation();

  const handleClick = () => {
    onClick();
  };

  return (
    <div
      className={cn(
        GAME_DEPLOYED_ACTOR_SLOT_SIZE_CLASS,
        GAME_DEPLOYED_ACTOR_CARD_CLASS,
        // Figma 160:130882 — Page&Sheet/white-to-secondary + Black Alpha/1 阴影（加大 blur，顶部发散更明显）
        'relative flex flex-col overflow-hidden rounded-xl bg-game-deployed-actor-card-surface',
        'shadow-[0_2px_20px_rgba(0,0,0,0.06)]',
      )}
    >
      {/* 与实卡同构：6:5 头图 + 信息区占位，保证空槽/加载/实卡同高 */}
      <div
        className={cn(
          'w-full shrink-0',
          GAME_DEPLOYED_ACTOR_COVER_ASPECT_CLASS,
        )}
        aria-hidden
      />
      <div className="flex min-h-0 flex-1 flex-col gap-3 p-4" aria-hidden>
        <div className="h-6 w-full" />
        <div className="flex flex-col gap-0.5">
          <div className="h-4 w-full" />
          <div className="h-5 w-full" />
        </div>
        <div className="mt-auto h-9 w-full" />
      </div>
      <Button
        type="button"
        variant="ghost"
        onClick={handleClick}
        className={cn(
          // Layout & Positioning
          'group/empty-slot absolute inset-0 h-auto min-h-0 w-full flex-col gap-3 rounded-xl p-3',
          // Visuals
          'bg-game-deployed-actor-card-surface border border-transparent',
          // Interactions — Figma 160:143992 悬停：Border/secondary 描边
          'hover:border-game-header-action-border hover:bg-game-deployed-actor-card-surface',
          'hover:text-game-header-title',
        )}
      >
        {/* Socrates DS 4043:3933「默认头像」；深浅色走 avatar token */}
        <IconDeploySlotEmptyAvatar className="size-11 shrink-0" />
        <span className={GAME_DEPLOYED_EMPTY_SLOT_CTA_CLASS}>{t('演出')}</span>
      </Button>
    </div>
  );
}
