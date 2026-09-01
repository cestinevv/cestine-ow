import type { Story } from '@ladle/react';

import { UserAvatar } from './UserAvatar';

const SAMPLE_USER_ID = 'demo-onestory-user';

export const Default: Story = () => (
  <div className="flex items-center gap-4 p-4">
    <UserAvatar userId={SAMPLE_USER_ID} size={40} />
  </div>
);

export const Sizes: Story = () => (
  <div className="flex items-center gap-4 p-4">
    <UserAvatar userId={SAMPLE_USER_ID} size={24} />
    <UserAvatar userId={SAMPLE_USER_ID} size={40} />
    <UserAvatar userId={SAMPLE_USER_ID} size={64} />
    <UserAvatar userId={SAMPLE_USER_ID} size={96} />
  </div>
);
