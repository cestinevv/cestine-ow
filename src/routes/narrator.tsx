import { createFileRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';

import { AppLoginPromptGate } from '@/components/AppLoginPromptGate';
import { NarratorManagementTab } from '@/features/narrator/constants/narratorManagementTabs';
import { NarratorView } from '@/features/narrator/NarratorView';
import { seo } from '@/utils';

const narratorSearchSchema = z.object({
  tab: z.nativeEnum(NarratorManagementTab).optional().catch(undefined),
});

export const Route = createFileRoute('/narrator')({
  validateSearch: (search) => narratorSearchSchema.parse(search),
  beforeLoad: ({ location }) => {
    if (location.pathname === '/narrator') {
      throw redirect({ to: '/creation-management', replace: true });
    }
  },
  component: NarratorRouteGuard,
  head: () => ({
    meta: [
      ...seo({
        title: 'Narrator Center | StoryFun',
        description:
          'StoryFun Narrator Center — manage short dramas and drama NFTs.',
      }),
    ],
  }),
});

function NarratorRouteGuard() {
  return (
    <AppLoginPromptGate>
      <NarratorView />
    </AppLoginPromptGate>
  );
}
