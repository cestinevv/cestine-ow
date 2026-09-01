import type { UserSearchItemResponse } from '@/api/__generated__/wallet/model/userSearchItemResponse';
import { SearchInfiniteFooter } from '@/features/search/components/SearchInfiniteFooter';
import { SearchResultsGrid } from '@/features/search/components/SearchResultsGrid';
import { SearchUserCard } from '@/features/search/components/SearchUserCard';
import { readSnowflakeId } from '@/utils';

type SearchUserResultsProps = {
  items: UserSearchItemResponse[];
  isLoading: boolean;
  isError: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  currentUserId?: string;
  pendingUserId?: string;
  onLoadMore: () => void;
  onFollowToggle: (item: UserSearchItemResponse) => void;
};

export function SearchUserResults({
  items,
  isLoading,
  isError,
  hasNextPage,
  isFetchingNextPage,
  currentUserId,
  pendingUserId,
  onLoadMore,
  onFollowToggle,
}: SearchUserResultsProps) {
  return (
    <SearchResultsGrid
      items={items}
      isLoading={isLoading}
      isError={isError}
      getItemKey={(item) => readSnowflakeId(item.userId) ?? item.nickname ?? ''}
      renderItem={(item) => (
        <SearchUserCard
          item={item}
          isSelf={readSnowflakeId(item.userId) === currentUserId}
          isPending={readSnowflakeId(item.userId) === pendingUserId}
          onFollowToggle={onFollowToggle}
        />
      )}
      className="grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
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
