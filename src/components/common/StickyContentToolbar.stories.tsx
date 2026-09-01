import type { Story } from '@ladle/react';

import { ContentContainer } from './ContentContainer';
import { StickyContentToolbar } from './StickyContentToolbar';

export const Default: Story = () => (
  <div className="w-full bg-points-page-surface-muted p-4">
    <ContentContainer className="flex flex-col gap-4 py-4">
      <StickyContentToolbar className="gap-3 pb-3" aria-label="吸顶工具栏示例">
        <p className="text-sm font-medium text-foreground">筛选区（吸顶壳）</p>
        <p className="text-xs text-muted-foreground">
          移动端横向铺满版心留白；滚动时 sticky top-11。
        </p>
      </StickyContentToolbar>
      <div className="flex h-96 items-center justify-center rounded-lg bg-muted text-sm text-muted-foreground">
        列表内容占位（向下滚动可观察吸顶）
      </div>
    </ContentContainer>
  </div>
);

export const SiteNavOffset: Story = () => (
  <div className="w-full bg-points-page-surface-muted p-4">
    <ContentContainer className="flex flex-col gap-4 py-4">
      <StickyContentToolbar
        as="div"
        topOffset="site-nav"
        className="gap-4 pb-2 pt-4 md:pt-8"
      >
        <p className="text-base font-bold text-foreground">角色 IP 风格</p>
        <p className="text-sm text-muted-foreground">
          topOffset=&quot;site-nav&quot; → top-11 / md:top-14
        </p>
      </StickyContentToolbar>
      <div className="flex h-64 items-center justify-center rounded-lg bg-muted text-sm text-muted-foreground">
        列表内容占位
      </div>
    </ContentContainer>
  </div>
);
