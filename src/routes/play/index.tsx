import { createFileRoute } from '@tanstack/react-router';

import { PlayListView } from '@/features/play/PlayListView';
import { seo } from '@/utils';

export const Route = createFileRoute('/play/')({
  component: PlayListView,
  head: () => ({
    meta: [
      ...seo({
        title: 'Short Play | StoryFun',
        description:
          'Selected AI short dramas — discover stories and start watching.',
      }),
    ],
  }),
});
