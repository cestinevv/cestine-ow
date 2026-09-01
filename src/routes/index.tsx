import { createFileRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';

import { PlayRecommendView } from '@/features/play/PlayRecommendView';
import { seo } from '@/utils';

/** 后端 X OAuth redirect_uri 指向站点根路径，授权回跳带 code/state 落在首页 */
const indexOAuthSearchSchema = z.object({
  code: z.string().optional().catch(undefined),
  state: z.string().optional().catch(undefined),
  error: z.string().optional().catch(undefined),
});

export const Route = createFileRoute('/')({
  validateSearch: (search) => indexOAuthSearchSchema.parse(search),
  beforeLoad: ({ search }) => {
    if (search.code && search.state) {
      throw redirect({
        to: '/social-bind',
        search: {
          code: search.code,
          state: search.state,
        },
        replace: true,
      });
    }

    if (search.error) {
      throw redirect({
        to: '/social-bind',
        search: {
          error: search.error,
        },
        replace: true,
      });
    }
  },
  component: PlayRecommendView,
  head: () => ({
    meta: [
      ...seo({
        title: 'Recommend | StoryFun',
        description:
          'Recommended AI short dramas and videos — discover stories and start watching.',
      }),
    ],
  }),
});
