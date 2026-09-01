import { createFileRoute } from '@tanstack/react-router';

import { IncomeView } from '@/features/income/IncomeView';
import { seo } from '@/utils';

export const Route = createFileRoute('/income/')({
  component: IncomeView,
  head: () => ({
    meta: [
      ...seo({
        title: 'Earnings | StoryFun',
        description:
          'View STORY and USDC earnings, claim rewards, and track income history.',
      }),
    ],
  }),
});
