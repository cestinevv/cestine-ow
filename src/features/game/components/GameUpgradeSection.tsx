import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { useGameUpgradableActorCount } from '@/features/game/hooks/useGameUpgradableActorCount';
import { cn, formatNumber } from '@/utils';
import { GameUpgradeActorsDialog } from './GameUpgradeActorsDialog';

export function GameUpgradeSection() {
  const { t } = useTranslation();
  const { upgradableActorCount } = useGameUpgradableActorCount();
  const [isUpgradeDialogOpen, setIsUpgradeDialogOpen] = useState(false);

  const handleOpenUpgradeDialog = () => {
    setIsUpgradeDialogOpen(true);
  };

  const handleUpgradeDialogOpenChange = (open: boolean) => {
    setIsUpgradeDialogOpen(open);
  };

  return (
    <>
      <section
        className={cn(
          // Layout & Positioning
          'flex min-h-0 min-w-0 flex-1 flex-col',
          // Spacing — Figma 198:44076 / 125:127914
          'gap-4 p-5',
          // Visual — Page&Sheet/white-to-thirdly
          'rounded-2xl bg-game-header-surface',
        )}
      >
        <header>
          <h2 className="text-lg leading-6.5 font-bold tracking-[-0.04px] text-game-header-title">
            {t('升级')}
          </h2>
        </header>

        {/* Figma：数量 20/28 Bold，单位「位」12/16 Secondary；行底 secondary-to-primary */}
        <div
          className={cn(
            'flex h-11 items-center justify-between',
            'px-4 py-1.5',
            'rounded-xl bg-game-panel-row-surface',
          )}
        >
          <span className="text-sm leading-5 text-game-header-title">
            {t('可升级角色')}
          </span>
          <p className="flex items-baseline gap-1 text-center whitespace-nowrap">
            <span className="text-xl leading-7 font-bold tracking-[-0.08px] text-game-header-title">
              {upgradableActorCount !== undefined
                ? formatNumber(upgradableActorCount, 0)
                : '-'}
            </span>
            <span className="text-xs leading-4 tracking-[0.04px] text-game-header-subtitle">
              {t('位')}
            </span>
          </p>
        </div>

        <Button
          type="button"
          className={cn(
            'h-11 w-full rounded-xl px-4 py-2.5',
            'bg-game-panel-cta-surface text-game-panel-cta-foreground',
            'text-sm leading-5 font-bold',
            'hover:bg-game-panel-cta-hover hover:text-game-panel-cta-foreground',
          )}
          onClick={handleOpenUpgradeDialog}
        >
          {t('去升级')}
        </Button>
      </section>

      <GameUpgradeActorsDialog
        open={isUpgradeDialogOpen}
        onOpenChange={handleUpgradeDialogOpenChange}
      />
    </>
  );
}
