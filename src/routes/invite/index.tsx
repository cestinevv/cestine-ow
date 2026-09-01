import { createFileRoute } from '@tanstack/react-router';

import { InviteView } from '@/features/invite/InviteView';
import { seo } from '@/utils';

export const Route = createFileRoute('/invite/')({
  component: InviteView,
  head: () => ({
    meta: [
      ...seo({
        title: 'Invite | StoryFun',
        description:
          'Invite friends, track referral stats, and earn STORY rewards.',
      }),
    ],
  }),
});
