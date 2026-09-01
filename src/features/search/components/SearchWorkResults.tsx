import type { FeedItemResponse } from '@/api/__generated__/recommend/model/feedItemResponse';
import {
  PLAY_THEATER_GRID_VIEW_CLASS,
  PLAY_THEATER_GRID_VIEW_DESKTOP_CLASS,
} from '@/features/play/playFormat';
import { SearchInfiniteFooter } from '@/features/search/components/SearchInfiniteFooter';
import { SearchResultsGrid } from '@/features/search/components/SearchResultsGrid';
import { SearchWorkCard } from '@/features/search/components/SearchWorkCard';
import { cn } from '@/utils';

type SearchWorkResultsProps = {
  items: FeedItemResponse[];
  isLoading: boolean;
  isError: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onBeforePlay: () => void;
  onLoadMore: () => void;
};

export function SearchWorkResults({
  items,
  isLoading,
  isError,
  hasNextPage,
  isFetchingNextPage,
  onBeforePlay,
  onLoadMore,
}: SearchWorkResultsProps) {
  return (
    <SearchResultsGrid
      items={items}
      isLoading={isLoading}
      isError={isError}
      getItemKey={(item) =>
        item.episode?.episodeId ??
        item.episode?.title ??
        item.drama?.title ??
        ''
      }
      renderItem={(item) => (
        <SearchWorkCard item={item} onBeforePlay={onBeforePlay} />
      )}
      className={cn(
        PLAY_THEATER_GRID_VIEW_CLASS,
        PLAY_THEATER_GRID_VIEW_DESKTOP_CLASS,
      )}
      footer={
        <SearchInfiniteFooter
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          onLoadMore={onLoadMore}
        />
      }
    />
  );
}
