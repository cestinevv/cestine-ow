import { useState } from 'react';

import type { ActorDTO } from '@/api/__generated__/mining/model/actorDTO';
import { ContentContainer } from '@/components/common/ContentContainer';
import { cn } from '@/utils';

import { GameCandidateActorsDialog } from './components/GameCandidateActorsDialog';
import { GameDeployedActorsSection } from './components/GameDeployedActorsSection';
import { GamePageHeader } from './components/GamePageHeader';
import { GameRefillStaminaDialog } from './components/GameRefillStaminaDialog';
import { GameTodoSection } from './components/GameTodoSection';
import { GameUpgradeSection } from './components/GameUpgradeSection';
import { GameWaitingActorsSection } from './components/GameWaitingActorsSection';

export function GameView() {
  const [isCandidateDialogOpen, setIsCandidateDialogOpen] = useState(false);
  const [replenishActor, setReplenishActor] = useState<ActorDTO | null>(null);
  const [isReplenishDialogOpen, setIsReplenishDialogOpen] = useState(false);

  const handleOpenCandidateDialog = () => {
    setIsCandidateDialogOpen(true);
  };

  const handleCandidateDialogOpenChange = (open: boolean) => {
    setIsCandidateDialogOpen(open);
  };

  const handleOpenReplenishDialog = (actor: ActorDTO) => {
    setReplenishActor(actor);
    setIsReplenishDialogOpen(true);
  };

  const handleReplenishDialogOpenChange = (open: boolean) => {
    setIsReplenishDialogOpen(open);
    if (!open) {
      setReplenishActor(null);
    }
  };

  return (
    <main
      className={cn(
        'flex min-h-0 w-full min-w-0 flex-1 flex-col',
        'bg-game-page-surface',
      )}
    >
      <ContentContainer
        className={cn('flex flex-col md:py-8', 'max-md:min-h-0 max-md:flex-1')}
      >
        <GamePageHeader
          onOpenCandidateDialog={handleOpenCandidateDialog}
          onOpenReplenishDialog={handleOpenReplenishDialog}
        />
        <div
          className={cn(
            'mt-4 flex min-w-0 flex-col md:mt-6',
            'gap-4 md:gap-3',
            'max-md:min-h-0 max-md:flex-1 max-md:flex max-md:flex-col',
          )}
        >
          <div
            className={cn(
              'flex min-w-0 flex-col gap-4 md:flex-row md:items-stretch md:gap-3',
              'max-md:min-h-0 max-md:flex-1 max-md:flex max-md:flex-col',
            )}
          >
            <div className="contents md:flex md:min-w-0 md:flex-1 md:flex-col md:gap-3">
              <div
                className={cn(
                  'w-full min-w-0',
                  'max-md:min-h-0 max-md:flex max-md:flex-1 max-md:flex-col',
                )}
              >
                <GameDeployedActorsSection
                  onOpenCandidateDialog={handleOpenCandidateDialog}
                  onOpenReplenishDialog={handleOpenReplenishDialog}
                />
              </div>
              <div
                className={cn(
                  'order-3 flex w-full min-w-0 flex-col gap-3 md:order-none',
                  'max-md:hidden',
                  'lg:flex-row lg:items-stretch',
                )}
              >
                <GameTodoSection
                  onOpenCandidateDialog={handleOpenCandidateDialog}
                  onOpenReplenishDialog={handleOpenReplenishDialog}
                />
                <GameUpgradeSection />
              </div>
            </div>
            <div
              className={cn(
                'hidden w-full shrink-0',
                'md:relative md:block md:min-h-0 md:w-[136px] md:self-stretch md:overflow-hidden',
              )}
            >
              <GameWaitingActorsSection
                variant="desktop"
                onOpenCandidateDialog={handleOpenCandidateDialog}
              />
            </div>
          </div>
        </div>
      </ContentContainer>

      <GameCandidateActorsDialog
        open={isCandidateDialogOpen}
        onOpenChange={handleCandidateDialogOpenChange}
      />
      <GameRefillStaminaDialog
        open={isReplenishDialogOpen}
        onOpenChange={handleReplenishDialogOpenChange}
        actor={replenishActor}
      />
    </main>
  );
}
