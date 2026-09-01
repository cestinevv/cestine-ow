import { createFileRoute } from '@tanstack/react-router';

import { ActorPlazaView } from '@/features/actor/ActorPlazaView';
import { guardDevOnlyRouteIfDisabled } from '@/routing/tempNavGate';
import { seo } from '@/utils';

export const Route = createFileRoute('/actor/')({
  beforeLoad: () => {
    guardDevOnlyRouteIfDisabled();
  },
  component: ActorPlazaView,
  head: () => ({
    meta: [
      ...seo({
        title: 'Character IP | StoryFun',
        description:
          'Discover AI role IPs and sign exclusive roles for your stories.',
      }),
    ],
  }),
});
