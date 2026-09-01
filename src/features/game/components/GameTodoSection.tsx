import { useTranslation } from 'react-i18next';

import type { ActorDTO } from '@/api/__generated__/mining/model/actorDTO';
import { GameTodoList } from '@/features/game/components/GameTodoList';
import { GAME_TODO_LIST_MAX_VISIBLE_ITEMS } from '@/features/game/constants/gameScrollAreaStyles';
import { useGameTodoItems } from '@/features/game/hooks/useGameTodoItems';
import { cn, formatNumber } from '@/utils';

type GameTodoSectionProps = {
  onOpenCandidateDialog: () => void;
  onOpenReplenishDialog: (actor: ActorDTO) => void;
};

export function GameTodoSection({
  onOpenCandidateDialog,
  onOpenReplenishDialog,
}: GameTodoSectionProps) {
  const { t } = useTranslation();
  const { todoItems, todoCount } = useGameTodoItems();

  return (
    <section
      className={cn(
        'flex min-h-0 min-w-0 flex-1 flex-col',
        'gap-4 rounded-2xl p-5',
        'bg-game-header-surface',
      )}
    >
      <header className="flex items-baseline gap-1">
        <h2 className="text-lg leading-[26px] font-bold tracking-[-0.04px] text-game-header-title">
          {t('待办')}
        </h2>
        <span className="text-sm leading-5 font-normal text-game-header-subtitle">
          {t('（{{count}}项）', { count: formatNumber(todoCount, 0) })}
        </span>
      </header>

      <GameTodoList
        todoItems={todoItems}
        maxVisibleItems={GAME_TODO_LIST_MAX_VISIBLE_ITEMS}
        onOpenCandidateDialog={onOpenCandidateDialog}
        onOpenReplenishDialog={onOpenReplenishDialog}
      />
    </section>
  );
}
