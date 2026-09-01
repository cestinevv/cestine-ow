import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import { AppLoginPromptGate } from '@/components/AppLoginPromptGate';
import { CreateShortVideoView } from '@/features/create-short-video/CreateShortVideoView';
import { seo } from '@/utils';

const createShortVideoSearchSchema = z.object({
  episodeId: z
    .preprocess(
      (value) => (typeof value === 'number' ? String(value) : value),
      z.string().regex(/^\d+$/),
    )
    .optional(),
});

export const Route = createFileRoute('/create-short-video')({
  validateSearch: (search) => createShortVideoSearchSchema.parse(search),
  component: CreateShortVideoRouteGuard,
  head: () => ({
    meta: [
      ...seo({
        title: 'Create Short Video | StoryFun',
        description: 'Upload and publish a short video on StoryFun.',
      }),
    ],
  }),
});

function CreateShortVideoRouteGuard() {
  const { episodeId } = Route.useSearch();

  return (
    <AppLoginPromptGate>
      <CreateShortVideoView editEpisodeId={episodeId} />
    </AppLoginPromptGate>
  );
}
