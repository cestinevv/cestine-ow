import type { FeedItemResponse } from '@/api/__generated__/recommend/model/feedItemResponse';
import { PlayDramaCard } from '@/features/play/components/PlayDramaCard';
import {
  PLAY_THEATER_GRID_VIEW_CLASS,
  PLAY_THEATER_GRID_VIEW_DESKTOP_CLASS,
} from '@/features/play/playFormat';
import { SearchInfiniteFooter } from '@/features/search/components/SearchInfiniteFooter';
import { SearchResultsGrid } from '@/features/search/components/SearchResultsGrid';
import { cn } from '@/utils';

type SearchDramaResultsProps = {
  items: FeedItemResponse[];
  isLoading: boolean;
  isError: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onBeforePlay: () => void;
  onLoadMore: () => void;
};

export function SearchDramaResults({
  items,
  isLoading,
  isError,
  hasNextPage,
  isFetchingNextPage,
  onBeforePlay,
  onLoadMore,
}: SearchDramaResultsProps) {
  return (
    <SearchResultsGrid
      items={items}
      isLoading={isLoading}
      isError={isError}
      getItemKey={(item) =>
        item.drama?.dramaId ??
        item.episode?.episodeId ??
        item.drama?.title ??
        ''
      }
      renderItem={(item) => (
        <PlayDramaCard
          item={item}
          onBeforePlay={onBeforePlay}
          showDuration={false}
        />
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
