import { Skeleton } from '@/components/ui/skeleton';
import { ACTOR_PLAZA_CARD_COVER_ASPECT_CLASS } from '@/features/actor/constants/actorPlazaCardGrid';
import { cn } from '@/utils';

export function ActorPlazaCardSkeleton() {
  return (
    <article
      aria-hidden
      className={cn(
        'flex w-full flex-col overflow-hidden rounded-[10px] bg-card',
      )}
    >
      <div
        className={cn(
          'relative w-full overflow-hidden',
          ACTOR_PLAZA_CARD_COVER_ASPECT_CLASS,
        )}
      >
        <Skeleton className="size-full rounded-none" />

        {/* 对齐封面左下角色 IP 胶囊 */}
        <Skeleton className="absolute bottom-3 left-3 h-6 w-24 rounded-full" />
      </div>

      <div className="flex shrink-0 flex-col gap-2 p-3">
        <Skeleton className="h-6 w-[70%] rounded-md" />

        <Skeleton className="h-9 w-full rounded-[10px]" />

        <Skeleton className="h-11 w-full rounded-xl" />

        {/* 对齐 footer：左剩余 / 右创作者 @handle */}
        <div className="flex min-w-0 items-center justify-between overflow-hidden">
          <Skeleton className="h-4 w-16 shrink-0 rounded-md" />
          <Skeleton className="h-4 w-2/5 shrink-0 rounded-md" />
        </div>
      </div>
    </article>
  );
}
