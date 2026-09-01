import { createFileRoute } from '@tanstack/react-router';

import { ActorDetailView } from '@/features/actor/ActorDetailView';
import { guardDevOnlyRouteIfDisabled } from '@/routing/tempNavGate';
import { seo } from '@/utils';

export const Route = createFileRoute('/actor/$actorId')({
  beforeLoad: () => {
    guardDevOnlyRouteIfDisabled();
  },
  component: ActorDetailRoute,
  head: () => ({
    meta: [
      ...seo({
        title: 'Role Details | StoryFun',
        description:
          'View role IP details, issuance info, signing price, and featured dramas.',
      }),
    ],
  }),
});

function ActorDetailRoute() {
  const { actorId } = Route.useParams();

  return <ActorDetailView actorId={actorId} />;
}
