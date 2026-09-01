import type { Story } from '@ladle/react';

import {
  UserProfileAvatar,
  UserProfileAvatarCircle,
} from './UserProfileAvatar';

const SAMPLE_USER_ID = 'demo-onestory-user';

export const StampDefault: Story = () => (
  <div className="flex items-center gap-4 p-4">
    <UserProfileAvatar userId={SAMPLE_USER_ID} size={64} alt="Stamp avatar" />
  </div>
);

export const FallbackChar: Story = () => (
  <div className="flex items-center gap-4 p-4">
    <UserProfileAvatar size={64} fallbackChar="A" />
  </div>
);

export const CustomUrl: Story = () => (
  <div className="flex items-center gap-4 p-4">
    <UserProfileAvatar
      userId={SAMPLE_USER_ID}
      avatarUrl="https://cdn.stamp.fyi/avatar/demo-custom?s=128"
      size={64}
      alt="Custom avatar"
    />
  </div>
);

export const CircleWithRing: Story = () => (
  <div className="flex items-center gap-6 p-4">
    <UserProfileAvatarCircle
      size={112}
      fallbackChar="V"
      ringClassName="ring-4 ring-language-switcher-active"
      containerClassName="size-28"
    />
    <UserProfileAvatarCircle
      userId={SAMPLE_USER_ID}
      size={112}
      containerClassName="size-28"
      ringClassName="ring-4 ring-language-switcher-active"
    />
  </div>
);
