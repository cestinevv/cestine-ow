import { useTranslation } from 'react-i18next';

import { Skeleton } from '@/components/ui/skeleton';
import { cn, SHOW_DEV_ONLY_UI } from '@/utils';

export function PlayTheaterBannerSkeleton() {
  const { t } = useTranslation();

  return (
    <section
      aria-busy="true"
      aria-label={t('剧场')}
      className="bg-points-page-surface-muted pt-0 md:pt-4"
    >
      <div
        className={cn(
          'relative mx-auto w-full overflow-hidden bg-card',
          '-mx-5 w-[calc(100%+2.5rem)] rounded-none aspect-[3/4]',
          'md:mx-0 md:aspect-[16/8] md:w-full md:max-h-[960px] md:rounded-[10px]',
          'min-[1280px]:rounded-xl',
        )}
      >
        <Skeleton className="absolute inset-0 size-full rounded-none md:rounded-[10px] min-[1280px]:rounded-xl" />

        <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-2 p-4 min-[1280px]:gap-3 min-[1280px]:p-8">
          {SHOW_DEV_ONLY_UI ? (
            <div className="flex w-full items-end">
              <Skeleton className="h-[115px] w-48 rounded-2xl min-[1280px]:h-[134px] min-[1280px]:w-56" />
            </div>
          ) : null}

          <div className="flex max-w-[640px] flex-col gap-1.5 md:gap-2">
            <Skeleton className="h-5 w-16 rounded-full md:h-6 md:w-20" />
            <Skeleton className="h-8 w-4/5 max-w-[480px] rounded-md md:h-10" />
            <Skeleton className="h-8 w-3/5 max-w-[320px] rounded-md md:hidden" />
          </div>

          <div className="relative flex w-full items-center">
            <Skeleton className="h-5 w-48 rounded-md" />
            <Skeleton className="absolute inset-x-0 mx-auto hidden h-6 w-32 rounded-full md:block" />
            <Skeleton className="ml-auto hidden size-6 rounded-md md:block" />
          </div>

          <div className="flex items-center justify-between md:hidden">
            <Skeleton className="mx-auto h-6 w-32 rounded-full" />
            <Skeleton className="size-6 rounded-md" />
          </div>
        </div>
      </div>
    </section>
  );
}
