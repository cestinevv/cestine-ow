import type { Story } from '@ladle/react';

import { AppDateTimeText } from './AppDateTimeText';

const sampleMs = Date.parse('2026-05-25T12:30:00');

export const Default: Story = () => (
  <div className="p-4">
    <AppDateTimeText value={sampleMs} />
  </div>
);

export const ResponsiveSplit: Story = () => (
  <div className="w-[180px] p-4">
    <AppDateTimeText
      value={sampleMs}
      layout="responsive-split"
      className="text-[14px] leading-5 font-medium text-foreground"
    />
  </div>
);

export const DateOnly: Story = () => (
  <div className="p-4">
    <AppDateTimeText value={sampleMs} pattern="YYYY-MM-DD" />
  </div>
);

export const DateTimeNoSeconds: Story = () => (
  <div className="p-4">
    <AppDateTimeText value={sampleMs} pattern="YYYY-MM-DD HH:mm" />
  </div>
);

export const Invalid: Story = () => (
  <div className="flex flex-col gap-2 p-4">
    <AppDateTimeText value={undefined} />
    <AppDateTimeText value={null} />
    <AppDateTimeText value="" fallback="—" />
    <AppDateTimeText value={Number.NaN} />
  </div>
);
