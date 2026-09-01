import { createFileRoute } from '@tanstack/react-router';

import { AppLoginPromptGate } from '@/components/AppLoginPromptGate';
import { ProfileView } from '@/features/profile/ProfileView';
import { parseProfileRouteSearch } from '@/features/profile/profileRouteSearch';
import { seo } from '@/utils';

export const Route = createFileRoute('/profile/')({
  validateSearch: parseProfileRouteSearch,
  component: ProfileIndexGuard,
  head: () => ({
    meta: [
      ...seo({
        title: 'Profile | StoryFun',
        description:
          'Manage your StoryFun profile, published dramas, likes, and favorites.',
      }),
    ],
  }),
});

function ProfileIndexGuard() {
  return (
    <AppLoginPromptGate>
      <ProfileView />
    </AppLoginPromptGate>
  );
}
