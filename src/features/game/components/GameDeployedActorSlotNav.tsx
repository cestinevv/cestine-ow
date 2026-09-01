import { useTranslation } from 'react-i18next';

import type { ActorDTO } from '@/api/__generated__/mining/model/actorDTO';
import IconDeploySlotEmptyAvatar from '@/assets/svg/IconDeploySlotEmptyAvatar';
import { Button } from '@/components/ui/button';
import {
  GAME_DEPLOY_SLOT_COUNT,
  GAME_DEPLOY_SLOT_NAV_GAP_PX,
  GAME_DEPLOY_SLOT_NAV_SIZE_PX,
} from '@/features/game/constants/gameConstants';
import { cn } from '@/utils';

type DeploySlot = ActorDTO | null;

type GameDeployedActorSlotNavProps = {
  slots: DeploySlot[];
  onSelect: (index: number) => void;
};

type GameDeployedActorSlotNavItemProps = {
  slot: DeploySlot;
  index: number;
  onSelect: (index: number) => void;
};

function GameDeployedActorSlotNavItem({
  slot,
  index,
  onSelect,
}: GameDeployedActorSlotNavItemProps) {
  const { t } = useTranslation();

  const avatarUrl = slot?.avatarUrl?.trim();
  const actorName = slot?.actorName?.trim();
  const isEmpty = slot === null;

  const handleSelect = () => {
    onSelect(index);
  };

  return (
    <li>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={
          isEmpty
            ? t('空派遣槽位 {{index}}', { index: index + 1 })
            : t('派遣槽位 {{index}}：{{name}}', {
                index: index + 1,
                name: actorName ?? t('角色'),
              })
        }
        onClick={handleSelect}
        className={cn(
          'box-border flex shrink-0 items-center justify-center rounded-full border-0 p-0',
          'bg-transparent shadow-none',
          'hover:bg-transparent hover:text-foreground',
          'focus-visible:outline-none focus-visible:ring-0',
          'active:translate-y-0',
          "[&_svg:not([class*='size-'])]:size-8",
        )}
        style={{
          width: GAME_DEPLOY_SLOT_NAV_SIZE_PX,
          height: GAME_DEPLOY_SLOT_NAV_SIZE_PX,
        }}
      >
        {isEmpty ? (
          <IconDeploySlotEmptyAvatar className="size-8 shrink-0" />
        ) : (
          <span className="block size-8 overflow-hidden rounded-full">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt=""
                className="size-full object-cover"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <IconDeploySlotEmptyAvatar className="size-full" />
            )}
          </span>
        )}
      </Button>
    </li>
  );
}

export function GameDeployedActorSlotNav({
  slots,
  onSelect,
}: GameDeployedActorSlotNavProps) {
  const { t } = useTranslation();

  return (
    <nav aria-label={t('派遣槽位导航')} className="flex w-full justify-center">
      <ul
        className="flex list-none items-center p-0"
        style={{ gap: GAME_DEPLOY_SLOT_NAV_GAP_PX }}
      >
        {Array.from({ length: GAME_DEPLOY_SLOT_COUNT }, (_, index) => (
          <GameDeployedActorSlotNavItem
            key={slots[index]?.actorNftId ?? `deploy-nav-empty-${index}`}
            slot={slots[index] ?? null}
            index={index}
            onSelect={onSelect}
          />
        ))}
      </ul>
    </nav>
  );
}
