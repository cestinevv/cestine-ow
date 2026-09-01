import { createFileRoute, redirect } from '@tanstack/react-router';

import { Story1011View } from '@/features/1011/Story1011View';
import { IS_PRODUCTION, seo } from '@/utils';

export const Route = createFileRoute('/1011')({
  beforeLoad: () => {
    if (IS_PRODUCTION) {
      throw redirect({ to: '/', replace: true });
    }
  },
  component: Story1011View,
  head: () => ({
    meta: [
      ...seo({
        title: "1011 Noah's Ark | StoryFun",
        description:
          "Write your 1011 story, board Noah's Ark, and earn rewards by points rank.",
      }),
    ],
  }),
});
