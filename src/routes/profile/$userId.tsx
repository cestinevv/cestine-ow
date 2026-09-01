import { createFileRoute } from '@tanstack/react-router';

import { ProfilePublicView } from '@/features/profile/ProfilePublicView';
import { parseProfileRouteSearch } from '@/features/profile/profileRouteSearch';
import { seo } from '@/utils';

export const Route = createFileRoute('/profile/$userId')({
  validateSearch: parseProfileRouteSearch,
  component: ProfilePublicView,
  head: () => ({
    meta: [
      ...seo({
        title: 'User profile | StoryFun',
        description: 'View a creator profile, works, likes, and favorites.',
      }),
    ],
  }),
});
