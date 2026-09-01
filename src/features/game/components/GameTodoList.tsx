import { useTranslation } from 'react-i18next';

import type { ActorDTO } from '@/api/__generated__/mining/model/actorDTO';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  GAME_PANEL_VERTICAL_SCROLL_AREA_CLASS,
  getGameTodoListScrollHeightPx,
} from '@/features/game/constants/gameScrollAreaStyles';
import type { GameTodoItem } from '@/features/game/hooks/useGameTodoItems';
import { cn, formatNumber } from '@/utils';

/** Figma 198:44074 / 125:127912「去演出 / 去补充」：32 高、8 圆角、描边 secondary、13/18 Bold */
const TODO_ACTION_BUTTON_CLASS = cn(
  'h-8 shrink-0 rounded-lg border border-game-header-action-border bg-transparent px-3',
  'text-[13px] leading-[18px] font-bold text-game-header-title',
  'hover:bg-game-header-action-hover hover:text-game-header-title',
);

type GameTodoListProps = {
  todoItems: GameTodoItem[];
  onOpenCandidateDialog: () => void;
  onOpenReplenishDialog: (actor: ActorDTO) => void;
  /** 超过该条数时启用竖向滚动；不传则不限高（如 Sheet 全量滚动） */
  maxVisibleItems?: number;
};

function formatActorLabel(actor: ActorDTO): string {
  const name = actor.actorName?.trim() ?? '';
  const code =
    actor.actorTokenId !== undefined
      ? `#${formatNumber(actor.actorTokenId, 0)}`
      : '';

  return `${name}${code ? ` ${code}` : ''}`.trim() || name;
}

export function GameTodoList({
  todoItems,
  onOpenCandidateDialog,
  onOpenReplenishDialog,
  maxVisibleItems,
}: GameTodoListProps) {
  const { t } = useTranslation();

  const handleOpenCandidateDialog = () => {
    onOpenCandidateDialog();
  };

  const handleOpenReplenish = (actor: ActorDTO) => () => {
    onOpenReplenishDialog(actor);
  };

  // Figma 262:47318 空态：单行「演位正常 · 体力充足」，无圆点 / 无操作按钮
  if (todoItems.length === 0) {
    return (
      <div
        className={cn(
          // Layout & Positioning
          'flex h-11 items-center',
          // Sizing & Spacing
          'py-1.5 pr-1.5 pl-4',
          // Visuals & Typography
          'rounded-xl bg-game-panel-row-surface',
        )}
      >
        <p className="text-sm leading-5 text-wallet-text-tertiary">
          {t('演位正常 · 体力充足')}
        </p>
      </div>
    );
  }

  const shouldScroll =
    maxVisibleItems !== undefined && todoItems.length > maxVisibleItems;

  const list = (
    <ul className="flex list-none flex-col gap-3 p-0">
      {todoItems.map((item) => (
        <li
          key={item.id}
          className={cn(
            'flex items-center justify-between gap-3 rounded-xl',
            'bg-game-panel-row-surface py-1.5 pr-1.5 pl-4',
          )}
        >
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span
              className={cn(
                'size-2 shrink-0 rounded-full',
                item.kind === 'vacancy'
                  ? 'bg-game-panel-dot-success'
                  : 'bg-game-panel-dot-error',
              )}
              aria-hidden
            />
            <p className="min-w-0 text-sm leading-5 text-game-header-title">
              {item.kind === 'vacancy'
                ? t('{{count}} 个在演位空缺', {
                    count: formatNumber(item.vacancyCount, 0),
                  })
                : t('{{name}} 体力仅剩 0，已停工', {
                    name: formatActorLabel(item.actor),
                  })}
            </p>
          </div>
          {item.kind === 'vacancy' ? (
            <Button
              type="button"
              variant="outline"
              className={TODO_ACTION_BUTTON_CLASS}
              onClick={handleOpenCandidateDialog}
            >
              {t('演出')}
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              className={TODO_ACTION_BUTTON_CLASS}
              onClick={handleOpenReplenish(item.actor)}
            >
              {t('补充')}
            </Button>
          )}
        </li>
      ))}
    </ul>
  );

  if (!shouldScroll) {
    return list;
  }

  return (
    <ScrollArea
      orientation="vertical"
      className={cn(
        'min-h-0 w-full overflow-hidden',
        GAME_PANEL_VERTICAL_SCROLL_AREA_CLASS,
      )}
      style={{ height: getGameTodoListScrollHeightPx(maxVisibleItems) }}
    >
      {list}
    </ScrollArea>
  );
}
