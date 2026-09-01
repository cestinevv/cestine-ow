import type { Story } from '@ladle/react';

import { AppTruncatedText } from './AppTruncatedText';

const longLabel = 'Victor短剧1Victor短剧1Victor短剧1Victor短剧1Victor短剧1';

export const Default: Story = () => (
  <div className="w-[168px] p-4">
    <AppTruncatedText className="text-sm leading-5 font-medium text-foreground">
      {longLabel}
    </AppTruncatedText>
  </div>
);

export const Fallback: Story = () => (
  <div className="w-[168px] p-4">
    <AppTruncatedText className="text-sm leading-5 font-medium text-foreground">
      -
    </AppTruncatedText>
  </div>
);
