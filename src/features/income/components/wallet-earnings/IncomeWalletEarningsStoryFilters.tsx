import { useTranslation } from 'react-i18next';

import {
  filterPillButtonActiveClassName,
  filterPillButtonBaseClassName,
  filterPillButtonInactiveClassName,
} from '@/components/common/Tabs';
import { Button } from '@/components/ui/button';
import { IncomeStoryEarningsFilter } from '@/features/income/incomeWalletEarningsFormat';
import { cn } from '@/utils';

type IncomeWalletEarningsStoryFiltersProps = {
  filter: IncomeStoryEarningsFilter;
  onFilterChange: (filter: IncomeStoryEarningsFilter) => void;
};

const STORY_FILTER_ITEMS = [
  { value: IncomeStoryEarningsFilter.All, labelKey: '全部' },
  { value: IncomeStoryEarningsFilter.Dispatch, labelKey: '派遣收益' },
  { value: IncomeStoryEarningsFilter.Invite, labelKey: '邀请收益' },
] as const;

export function IncomeWalletEarningsStoryFilters({
  filter,
  onFilterChange,
}: IncomeWalletEarningsStoryFiltersProps) {
  const { t } = useTranslation();

  return (
    <div className="flex w-full flex-wrap gap-2">
      {STORY_FILTER_ITEMS.map((item) => {
        const isActive = filter === item.value;

        return (
          <Button
            key={item.value}
            type="button"
            variant="ghost"
            className={cn(
              filterPillButtonBaseClassName,
              isActive
                ? filterPillButtonActiveClassName
                : filterPillButtonInactiveClassName,
            )}
            onClick={() => onFilterChange(item.value)}
          >
            {t(item.labelKey)}
          </Button>
        );
      })}
    </div>
  );
}
