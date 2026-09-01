import { useEffect } from 'react';
import { useInView } from 'react-intersection-observer';

import { IncomeWalletEarningsListFooter } from './IncomeWalletEarningsListFooter';

type IncomeWalletEarningsListSentinelProps = {
  visible: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  showTopBorder?: boolean;
  className?: string;
};

/** 收益列表触底加载：每个 Tab / 视口布局独立哨兵，避免共享 ref 导致翻页失效 */
export function IncomeWalletEarningsListSentinel({
  visible,
  isFetchingNextPage,
  hasNextPage,
  fetchNextPage,
  showTopBorder = true,
  className,
}: IncomeWalletEarningsListSentinelProps) {
  const { ref, inView } = useInView({ skip: !visible });

  useEffect(() => {
    if (visible && inView && hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [visible, inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <IncomeWalletEarningsListFooter
      sentinelRef={ref}
      isFetchingNextPage={isFetchingNextPage}
      hasNextPage={hasNextPage}
      visible={visible}
      showTopBorder={showTopBorder}
      className={className}
    />
  );
}
