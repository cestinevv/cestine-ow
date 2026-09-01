import { createFileRoute, redirect } from '@tanstack/react-router';

import { Topic1011View } from '@/features/home/Topic1011View';
import { IS_PRODUCTION, seo } from '@/utils';

export const Route = createFileRoute('/1011home')({
  beforeLoad: () => {
    if (IS_PRODUCTION) {
      throw redirect({ to: '/', replace: true });
    }
  },
  component: Topic1011View,
  head: () => ({
    meta: [
      ...seo({
        title: '1011 | StoryFun',
        description:
          'On October 11, 2025, 1.6 million went to zero. Winter is cold, yet the candle still burns.',
      }),
    ],
  }),
});
