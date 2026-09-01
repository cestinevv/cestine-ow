import '@/i18n';

import type { Story } from '@ladle/react';

import { VersionUpdateBanner } from './VersionUpdater';

export const Default: Story = () => (
  <div className="flex min-h-[240px] items-center justify-center bg-muted/30 p-4">
    <VersionUpdateBanner inline onRefresh={() => {}} onDismiss={() => {}} />
  </div>
);
