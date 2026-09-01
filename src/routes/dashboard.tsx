import { createFileRoute } from '@tanstack/react-router';

import { DashboardView } from '@/features/dashboard/DashboardView';
import { seo } from '@/utils';

export const Route = createFileRoute('/dashboard')({
  component: DashboardView,
  head: () => ({
    meta: [
      ...seo({
        title: 'Platform Treasury Dashboard | StoryFun',
        description:
          'View platform USDC revenue, vault reserves, and STORY release overview.',
      }),
    ],
  }),
});
