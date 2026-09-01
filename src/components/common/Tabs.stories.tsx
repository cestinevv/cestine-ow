import type { Story } from '@ladle/react';
import { useState } from 'react';

import { CommonTabs, FilterTabs } from './Tabs';

const LINE_ITEMS = [
  { value: 'drama', labelKey: '短剧管理' },
  { value: 'drama-nft', labelKey: '短剧NFT' },
  { value: 'actor', labelKey: '角色管理' },
  { value: 'actor-nft', labelKey: '持有角色NFT' },
] as const;

const FILTER_ITEMS = [
  { value: 'all', labelKey: '全部' },
  { value: 'approved', labelKey: '已通过' },
  { value: 'pending', labelKey: '审核中' },
  { value: 'rejected', labelKey: '未通过' },
] as const;

/** Story 内 mock：key 与稿面中文一致时直接回显 */
const mockT = (key: string) => key;

export const CommonTabsDefault: Story = () => {
  const [value, setValue] = useState('drama');

  return (
    <div className="flex w-full max-w-4xl flex-col gap-6 p-4">
      <CommonTabs
        items={LINE_ITEMS}
        value={value}
        onValueChange={setValue}
        t={mockT}
      />
    </div>
  );
};

export const FilterTabsDefault: Story = () => {
  const [value, setValue] = useState('all');

  return (
    <div className="flex w-full max-w-md flex-col gap-6 p-4">
      <FilterTabs
        items={FILTER_ITEMS}
        value={value}
        onValueChange={setValue}
        t={mockT}
      />
    </div>
  );
};
