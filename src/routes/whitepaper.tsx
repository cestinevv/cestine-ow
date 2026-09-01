import { createFileRoute } from '@tanstack/react-router';

import { WhitepaperView } from '@/features/whitepaper/WhitepaperView';
import { guardDevOnlyUiRouteIfHidden } from '@/routing/tempNavGate';
import { seo } from '@/utils';

export const Route = createFileRoute('/whitepaper')({
  beforeLoad: () => {
    guardDevOnlyUiRouteIfHidden();
  },
  component: WhitepaperView,
  head: () => ({
    meta: [
      ...seo({
        title: 'White Paper | StoryFun',
        description:
          'StoryFun white paper — protocol, token, and platform overview.',
      }),
    ],
  }),
});
