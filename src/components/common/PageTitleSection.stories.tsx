import type { Story } from '@ladle/react';

import { PageTitleSection } from './PageTitleSection';

export const TitleOnly: Story = () => (
  <div className="w-full bg-background p-6">
    <PageTitleSection title="发布新短剧" />
  </div>
);

export const WithSubtitle: Story = () => (
  <div className="w-full bg-background p-6">
    <PageTitleSection
      title="发行角色 IP"
      subtitle="发行一个角色 IP 之后可在该 IP 下签约角色，角色可派遣产生收益。"
    />
  </div>
);
