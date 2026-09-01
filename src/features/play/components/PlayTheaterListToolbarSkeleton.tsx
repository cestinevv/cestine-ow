import { useTranslation } from 'react-i18next';

import { StickyContentToolbar } from '@/components/common/StickyContentToolbar';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/utils';

const TAG_SKELETON_KEYS = [
  'tag-all',
  'tag-1',
  'tag-2',
  'tag-3',
  'tag-4',
  'tag-5',
] as const;

const SORT_SKELETON_KEYS = [
  { id: 'sort-hot', widthClass: 'w-8' },
  { id: 'sort-completed', widthClass: 'w-8' },
  { id: 'sort-latest', widthClass: 'w-8' },
  { id: 'sort-favorite', widthClass: 'w-16' },
] as const;

export function PlayTheaterListToolbarSkeleton() {
  const { t } = useTranslation();

  return (
    <StickyContentToolbar
      aria-busy="true"
      aria-label={t('短剧筛选')}
      className={cn(
        // Spacing — 与 PlayTheaterListToolbar 一致
        'gap-3 pt-5 pb-3 md:gap-4 md:pb-4 md:pt-11',
      )}
    >
      <div
        className={cn(
          'flex w-full items-start overflow-x-auto',
          'gap-5 md:gap-2',
          'pb-1',
          '[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
        )}
      >
        {TAG_SKELETON_KEYS.map((key, index) => (
          <Skeleton
            key={key}
            className={cn(
              'h-6 shrink-0 rounded-md md:h-9 md:rounded-full',
              index % 2 === 0 ? 'w-12 md:w-16' : 'w-16 md:w-20',
            )}
          />
        ))}
      </div>

      <div className="flex items-start gap-5 whitespace-nowrap">
        {SORT_SKELETON_KEYS.map((item) => (
          <Skeleton
            key={item.id}
            className={cn('h-6 shrink-0 rounded-md', item.widthClass)}
          />
        ))}
      </div>
    </StickyContentToolbar>
  );
}
