import type { Story } from '@ladle/react';

import { ContentContainer } from './ContentContainer';

export const Default: Story = () => (
  <div className="w-full bg-muted/40 p-4">
    <ContentContainer className="rounded-lg bg-background py-6">
      <p className="text-sm text-foreground">
        版心容器：max-w-[1832px] + 水平 padding，与 Header / 剧场列表对齐。
      </p>
    </ContentContainer>
  </div>
);

export const WithGrid: Story = () => (
  <div className="w-full bg-muted/40 p-4">
    <ContentContainer>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => index + 1).map((n) => (
          <div
            key={n}
            className="flex h-24 items-center justify-center rounded-lg bg-background text-sm text-muted-foreground"
          >
            Card {n}
          </div>
        ))}
      </div>
    </ContentContainer>
  </div>
);
