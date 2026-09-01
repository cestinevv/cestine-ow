import type { ActorCollectionResponse } from '@/api/__generated__/story/model/actorCollectionResponse';
import { ActorPlazaCard } from '@/features/actor/components/ActorPlazaCard';
import {
  ACTOR_PLAZA_GRID_VIEW_CLASS,
  ACTOR_PLAZA_GRID_VIEW_DESKTOP_CLASS,
} from '@/features/actor/constants/actorPlazaCardGrid';
import { SearchInfiniteFooter } from '@/features/search/components/SearchInfiniteFooter';
import { SearchResultsGrid } from '@/features/search/components/SearchResultsGrid';
import { cn, readSnowflakeId } from '@/utils';

type SearchActorResultsProps = {
  items: ActorCollectionResponse[];
  isLoading: boolean;
  isError: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  onMintSuccess: () => Promise<unknown>;
};

export function SearchActorResults({
  items,
  isLoading,
  isError,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  onMintSuccess,
}: SearchActorResultsProps) {
  return (
    <SearchResultsGrid
      items={items}
      isLoading={isLoading}
      isError={isError}
      getItemKey={(item) => readSnowflakeId(item.id) ?? item.name ?? ''}
      renderItem={(item) => (
        <ActorPlazaCard
          item={item}
          presentation="search"
          onMintSuccess={onMintSuccess}
        />
      )}
      className={cn(
        ACTOR_PLAZA_GRID_VIEW_CLASS,
        ACTOR_PLAZA_GRID_VIEW_DESKTOP_CLASS,
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
