import type { Key, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import AppLoadingContainer from '@/components/common/AppLoadingContainer';
import { cn } from '@/utils';

type SearchResultsGridProps<Item> = {
  items: Item[];
  isLoading: boolean;
  isError: boolean;
  getItemKey: (item: Item) => Key;
  renderItem: (item: Item) => ReactNode;
  /** 列模板由调用方传入：短剧/作品用剧场网格，角色用演员广场网格等 */
  className?: string;
  footer?: ReactNode;
};

export function SearchResultsGrid<Item>({
  items,
  isLoading,
  isError,
  getItemKey,
  renderItem,
  className,
  footer,
}: SearchResultsGridProps<Item>) {
  const { t } = useTranslation();

  return (
    <AppLoadingContainer
      data={items}
      isLoading={isLoading}
      isError={isError}
      minHeight={480}
      scrollable={false}
      emptyDescription={t('暂无相关内容')}
    >
      <ul className={cn('grid w-full list-none p-0', className)}>
        {items.map((item) => (
          <li key={getItemKey(item)} className="min-w-0">
            {renderItem(item)}
          </li>
        ))}
      </ul>
      {footer}
    </AppLoadingContainer>
  );
}
