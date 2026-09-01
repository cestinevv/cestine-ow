import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import { CreationManagementView } from '@/features/creation-management/CreationManagementView';
import { CreationManagementTab } from '@/features/creation-management/creationManagementFormat';
import { useAppLoginPromptGuard } from '@/hooks/useAppLoginPromptGuard';
import useGlobalStore from '@/stores/global';
import { seo } from '@/utils';

const creationManagementSearchSchema = z.object({
  tab: z.nativeEnum(CreationManagementTab).optional().catch(undefined),
});

export const Route = createFileRoute('/creation-management')({
  validateSearch: (search) => creationManagementSearchSchema.parse(search),
  component: CreationManagementRouteGuard,
  head: () => ({
    meta: [
      ...seo({
        title: 'Creation Management | StoryFun',
        description: 'Manage your short dramas and short videos on StoryFun.',
      }),
    ],
  }),
});

function CreationManagementRouteGuard() {
  const navigate = Route.useNavigate();
  const isLogin = useGlobalStore((state) => state.isLogin);

  useAppLoginPromptGuard(navigate);

  if (!isLogin) {
    return null;
  }

  return <CreationManagementView />;
}
