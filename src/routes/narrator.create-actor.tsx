import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import { AppLoginPromptGate } from '@/components/AppLoginPromptGate';
import { CreateActorView } from '@/features/create-actor/CreateActorView';
import { guardDevOnlyRouteIfDisabled } from '@/routing/tempNavGate';
import { seo } from '@/utils';

const createActorSearchSchema = z.object({
  actorId: z
    .preprocess(
      (value) => (typeof value === 'number' ? String(value) : value),
      z.string().regex(/^\d+$/),
    )
    .optional(),
});

export const Route = createFileRoute('/narrator/create-actor')({
  beforeLoad: () => {
    guardDevOnlyRouteIfDisabled();
  },
  validateSearch: (search) => createActorSearchSchema.parse(search),
  component: CreateActorRouteGuard,
  head: () => ({
    meta: [
      ...seo({
        title: 'Create Role | StoryFun',
        description:
          'Create a role profile, upload photos, and submit for review.',
      }),
    ],
  }),
});

function CreateActorRouteGuard() {
  return (
    <AppLoginPromptGate>
      <CreateActorView />
    </AppLoginPromptGate>
  );
}
