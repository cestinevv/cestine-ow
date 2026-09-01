import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import { SocialBindView } from '@/features/social/SocialBindView';
import { seo } from '@/utils';

const socialBindSearchSchema = z.object({
  code: z.string().optional().catch(undefined),
  state: z.string().optional().catch(undefined),
  error: z.string().optional().catch(undefined),
  bind: z.enum(['success', 'failed']).optional().catch(undefined),
});

export const Route = createFileRoute('/social-bind')({
  validateSearch: (search) => socialBindSearchSchema.parse(search),
  component: SocialBindView,
  head: () => ({
    meta: [
      ...seo({
        title: 'Bind X Account | StoryFun',
        description: 'Bind your X (Twitter) social account.',
      }),
    ],
  }),
});
