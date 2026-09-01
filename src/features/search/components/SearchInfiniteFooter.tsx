import { useEffect, useRef } from 'react';
import { useInView } from 'react-intersection-observer';

import { Spinner } from '@/components/ui/spinner';

type SearchInfiniteFooterProps = {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
};

export function SearchInfiniteFooter({
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}: SearchInfiniteFooterProps) {
  const { ref, inView } = useInView();
  const requestedWhileVisibleRef = useRef(false);

  useEffect(() => {
    if (!inView) {
      requestedWhileVisibleRef.current = false;
      return;
    }

    if (
      !hasNextPage ||
      isFetchingNextPage ||
      requestedWhileVisibleRef.current
    ) {
      return;
    }

    requestedWhileVisibleRef.current = true;
    onLoadMore();
  }, [hasNextPage, inView, isFetchingNextPage, onLoadMore]);

  if (!hasNextPage) {
    return null;
  }

  return (
    <div
      ref={ref}
      className="flex justify-center py-6"
      aria-hidden={!isFetchingNextPage}
    >
      {isFetchingNextPage ? (
        <Spinner className="size-6 text-muted-foreground" />
      ) : null}
    </div>
  );
}
