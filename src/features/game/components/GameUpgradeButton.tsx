import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useIsActorUpgradeSyncing } from '@/features/game/gameActorStaminaCache';
import { cn } from '@/utils';

type GameUpgradeButtonProps = {
  actorNftId?: string;
  disabled?: boolean;
  onClick: () => void;
};

export function GameUpgradeButton({
  actorNftId,
  disabled = false,
  onClick,
}: GameUpgradeButtonProps) {
  const { t } = useTranslation();
  const isUpgradeSyncing = useIsActorUpgradeSyncing(actorNftId);
  const isDisabled = disabled || isUpgradeSyncing;

  const handleClick = () => {
    if (isDisabled) {
      return;
    }

    onClick();
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="xs"
      disabled={isDisabled}
      className={cn(
        'absolute top-0 right-0 z-10 m-0 h-auto min-h-0 rounded-none rounded-bl-xl border-0',
        'bg-game-deployed-card-replenish-solid-surface px-2 py-1',
        'text-xs leading-4 font-medium text-white',
        'hover:bg-game-deployed-card-replenish-solid-surface hover:text-white',
        'active:translate-y-0',
        isUpgradeSyncing
          ? 'disabled:opacity-100 disabled:bg-game-deployed-card-replenish-solid-surface disabled:text-white'
          : 'disabled:opacity-60',
      )}
      onClick={handleClick}
    >
      {isUpgradeSyncing ? (
        <span className="inline-flex items-center justify-center gap-1">
          <Spinner className="size-4" />
          <span>{t('升级')}</span>
        </span>
      ) : (
        t('升级')
      )}
    </Button>
  );
}
