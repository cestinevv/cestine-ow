import { useTranslation } from 'react-i18next';

import type { ActorDTO } from '@/api/__generated__/mining/model/actorDTO';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { GameTodoList } from '@/features/game/components/GameTodoList';
import type { GameTodoItem } from '@/features/game/hooks/useGameTodoItems';
import { cn, formatNumber } from '@/utils';

type GameTodoSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  todoItems: GameTodoItem[];
  todoCount: number;
  onOpenCandidateDialog: () => void;
  onOpenReplenishDialog: (actor: ActorDTO) => void;
};

export function GameTodoSheet({
  open,
  onOpenChange,
  todoItems,
  todoCount,
  onOpenCandidateDialog,
  onOpenReplenishDialog,
}: GameTodoSheetProps) {
  const { t } = useTranslation();

  const handleOpenCandidateDialog = () => {
    onOpenCandidateDialog();
    onOpenChange(false);
  };

  const handleOpenReplenishDialog = (actor: ActorDTO) => {
    onOpenReplenishDialog(actor);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        overlayClassName={cn(
          'z-[210]',
          'bg-black/50 supports-backdrop-filter:backdrop-blur-md',
        )}
        className={cn(
          'z-[210] flex max-h-[min(85dvh,560px)] flex-col gap-0',
          'rounded-t-2xl p-0 pb-[max(1rem,env(safe-area-inset-bottom))]',
          'border-t border-border bg-game-header-surface text-game-header-title',
        )}
      >
        <SheetHeader className="shrink-0 px-5 pt-5 pb-0">
          <SheetTitle
            className={cn(
              'm-0 min-w-0 text-left',
              'text-lg leading-[26px] font-bold tracking-[-0.04px]',
              'text-game-header-title',
            )}
          >
            {t('待办')}
            <span className="ml-1 text-sm leading-5 font-normal text-game-header-subtitle">
              {t('（{{count}}项）', {
                count: formatNumber(todoCount, 0),
              })}
            </span>
          </SheetTitle>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-5">
          <GameTodoList
            todoItems={todoItems}
            onOpenCandidateDialog={handleOpenCandidateDialog}
            onOpenReplenishDialog={handleOpenReplenishDialog}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
