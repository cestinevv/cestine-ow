import { Skeleton } from '@/components/ui/skeleton';
import { PLAY_CARD_COVER_ASPECT_CLASS } from '@/features/play/playFormat';
import { cn } from '@/utils';

export function PlayTheaterDramaCardSkeleton() {
  return (
    <article
      aria-hidden
      className={cn(
        'flex h-full w-full flex-col overflow-hidden rounded-[10px] bg-card',
      )}
    >
      <div
        className={cn(
          'relative w-full overflow-hidden',
          PLAY_CARD_COVER_ASPECT_CLASS,
        )}
      >
        <Skeleton className="size-full rounded-none" />

        <div className="absolute inset-x-3 bottom-3 z-10 flex flex-col items-start gap-2">
          <Skeleton className="h-10 w-[148px] shrink-0 rounded-full" />

          <div className="flex w-full items-center gap-4 overflow-hidden">
            <Skeleton className="h-5 w-11 shrink-0 rounded-md" />
            <Skeleton className="h-5 w-11 shrink-0 rounded-md" />
            <Skeleton className="h-5 w-9 shrink-0 rounded-md" />
          </div>
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-2 p-3">
        <Skeleton className="h-6 w-full max-w-[90%] rounded-md" />
        <div className="flex min-w-0 items-center gap-2 overflow-hidden">
          <Skeleton className="h-4 min-w-0 flex-1 rounded-md" />
          <Skeleton className="h-4 min-w-0 flex-1 max-w-[50%] rounded-md" />
        </div>
      </div>
    </article>
  );
}
