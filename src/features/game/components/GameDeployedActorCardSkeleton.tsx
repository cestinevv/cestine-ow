import { Skeleton } from '@/components/ui/skeleton';
import {
  GAME_DEPLOYED_ACTOR_CARD_CLASS,
  GAME_DEPLOYED_ACTOR_COVER_ASPECT_CLASS,
  GAME_DEPLOYED_ACTOR_SLOT_SIZE_CLASS,
} from '@/features/game/constants/gameConstants';
import { cn } from '@/utils';

/**
 * 「演出中」已派遣卡骨架。
 * 结构与 `GameDeployedActorCard` carousel 变体 1:1：6:5 头图 + Lv 角标 + 标题/#号 + 体力行 + 片酬 + 补充/休息。
 */
export function GameDeployedActorCardSkeleton() {
  return (
    <article
      aria-hidden
      data-slot="game-deployed-actor-card"
      className={cn(
        GAME_DEPLOYED_ACTOR_SLOT_SIZE_CLASS,
        GAME_DEPLOYED_ACTOR_CARD_CLASS,
        'flex flex-col overflow-hidden rounded-xl bg-game-deployed-actor-card-surface',
        'shadow-[0_4px_20px_rgba(0,0,0,0.05)]',
      )}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        {/* 头图区：对齐实卡 aspect + Lv 角标 top-4 left-4 */}
        <div
          className={cn(
            'relative w-full shrink-0 overflow-hidden bg-muted',
            GAME_DEPLOYED_ACTOR_COVER_ASPECT_CLASS,
          )}
        >
          <Skeleton className="size-full rounded-none" />
          <Skeleton className="absolute top-4 left-4 h-6 w-11 rounded-full" />
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
          {/* 标题行：姓名 + #编号 */}
          <header className="flex min-w-0 items-baseline gap-1">
            <Skeleton className="h-6 min-w-0 flex-1 max-w-[70%] rounded-md" />
            <Skeleton className="h-4 w-8 shrink-0 rounded-md" />
          </header>

          {/* 体力条 + 片酬 */}
          <div className="flex flex-col gap-0.5">
            <div className="flex w-full items-center gap-1">
              <Skeleton className="h-[6px] min-w-0 flex-1 rounded-[12px]" />
              <Skeleton className="size-4 shrink-0 rounded-sm" />
              <Skeleton className="h-4 w-12 shrink-0 rounded-md" />
            </div>
            <Skeleton className="h-5 w-[7.5rem] rounded-md" />
          </div>

          {/* 补充 / 休息 */}
          <div className="mt-auto flex gap-3">
            <Skeleton className="h-9 flex-1 rounded-xl" />
            <Skeleton className="h-9 flex-1 rounded-xl" />
          </div>
        </div>
      </div>
    </article>
  );
}
