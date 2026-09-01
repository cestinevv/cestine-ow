import { useTranslation } from 'react-i18next';

import type { DramaListItemResponse } from '@/api/__generated__/story/model/dramaListItemResponse';
import type { DramaTagItemResponse } from '@/api/__generated__/story/model/dramaTagItemResponse';
import type { ListPublicDramasSort } from '@/api/__generated__/story/model/listPublicDramasSort';
import { StickyContentToolbar } from '@/components/common/StickyContentToolbar';
import {
  filterPillButtonActiveClassName,
  filterPillButtonBaseClassName,
  filterPillButtonInactiveClassName,
} from '@/components/common/Tabs';
import { Button } from '@/components/ui/button';
import type { PlayTheaterViewMode } from '@/features/play/constants/playTheaterViewMode';
import { useHorizontalDragScroll } from '@/hooks/useHorizontalDragScroll';
import { cn } from '@/utils';

type PlayTheaterListToolbarProps = {
  selectedTagId: number | undefined;
  selectedSort: ListPublicDramasSort;
  tags: DramaTagItemResponse[];
  sortOptions: ReadonlyArray<{
    value: ListPublicDramasSort;
    labelKey: string;
  }>;
  searchDraft: string;
  searchKeyword: string | undefined;
  searchItems: DramaListItemResponse[];
  isSearchLoading: boolean;
  isSearchError: boolean;
  viewMode: PlayTheaterViewMode;
  onTagChange: (tagId: number | undefined) => void;
  onSortChange: (sort: ListPublicDramasSort) => void;
  onSearchDraftChange: (value: string) => void;
  onSearchClear: () => void;
  onSearchSubmit: () => void;
  onViewModeChange: (mode: PlayTheaterViewMode) => void;
};

/** H5 稿 48:48899：标签/排序均为文字链 gap-20 */
const MOBILE_FILTER_TEXT_BASE =
  'h-auto shrink-0 rounded-none p-0 text-base leading-6 tracking-normal hover:bg-transparent';

export function PlayTheaterListToolbar({
  selectedTagId,
  selectedSort,
  tags,
  sortOptions,
  onTagChange,
  onSortChange,
}: PlayTheaterListToolbarProps) {
  const { t } = useTranslation();
  const {
    ref: tagScrollRef,
    isDragging,
    dragHandlers,
  } = useHorizontalDragScroll();

  return (
    <StickyContentToolbar
      aria-label={t('短剧筛选')}
      className={cn(
        // Spacing — 剧场筛选区自有上下留白与 gap
        'gap-3 pt-5 pb-3 md:gap-4 md:pb-4 md:pt-11',
      )}
    >
      <div
        ref={tagScrollRef}
        {...dragHandlers}
        className={cn(
          // Layout & Positioning
          'flex w-full items-start overflow-x-auto',
          // Spacing — H5 gap-20；桌面胶囊 gap-8
          'gap-5 md:gap-2',
          // Visual
          'pb-1',
          '[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
          // Interactions & States
          isDragging ? 'cursor-grabbing select-none' : 'cursor-grab',
        )}
      >
        <Button
          type="button"
          variant="ghost"
          onClick={() => onTagChange(undefined)}
          className={cn(
            MOBILE_FILTER_TEXT_BASE,
            'md:hidden',
            selectedTagId === undefined
              ? 'font-medium text-foreground hover:text-foreground'
              : 'font-normal text-muted-foreground hover:text-foreground',
          )}
        >
          {t('全部')}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => onTagChange(undefined)}
          className={cn(
            // Figma 7390:88962 — 桌面胶囊
            'hidden md:inline-flex',
            filterPillButtonBaseClassName,
            selectedTagId === undefined
              ? filterPillButtonActiveClassName
              : filterPillButtonInactiveClassName,
          )}
        >
          {t('全部')}
        </Button>
        {tags.map((tag) => {
          const tagId = tag.id;
          if (tagId === undefined) {
            return null;
          }

          const active = selectedTagId === tagId;
          const label = tag.name?.trim() || tag.code?.trim() || String(tagId);

          return (
            <span key={tagId} className="contents">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onTagChange(tagId)}
                className={cn(
                  MOBILE_FILTER_TEXT_BASE,
                  'md:hidden',
                  active
                    ? 'font-medium text-foreground hover:text-foreground'
                    : 'font-normal text-muted-foreground hover:text-foreground',
                )}
              >
                {label}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onTagChange(tagId)}
                className={cn(
                  'hidden md:inline-flex',
                  filterPillButtonBaseClassName,
                  active
                    ? filterPillButtonActiveClassName
                    : filterPillButtonInactiveClassName,
                )}
              >
                {label}
              </Button>
            </span>
          );
        })}
      </div>

      <div className="flex items-start gap-5 whitespace-nowrap text-base leading-6 tracking-normal">
        {sortOptions.map((option) => {
          const active = selectedSort === option.value;

          return (
            <Button
              key={option.value}
              type="button"
              variant="ghost"
              onClick={() => onSortChange(option.value)}
              className={cn(
                // Layout & Positioning / Spacing
                'h-auto rounded-none p-0',
                // Visuals & Typography — Figma 48:48353 Typography/4 Medium|Regular
                'text-base leading-6 tracking-normal hover:bg-transparent',
                // Interactions & States
                active
                  ? 'font-medium text-foreground hover:text-foreground'
                  : 'font-normal text-muted-foreground hover:text-foreground',
              )}
            >
              {t(option.labelKey)}
            </Button>
          );
        })}
      </div>
    </StickyContentToolbar>
  );
}
