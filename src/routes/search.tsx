import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { z } from 'zod';

import { SearchView } from '@/features/search/SearchView';
import {
  DEFAULT_SEARCH_TAB,
  SEARCH_TABS,
  sanitizeSearchTab,
} from '@/features/search/searchTypes';
import { seo } from '@/utils';

const searchRouteSchema = z.object({
  q: z
    .preprocess((value) => {
      if (
        value === null ||
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
      ) {
        return String(value);
      }

      return value;
    }, z.string().trim().optional())
    .catch(undefined),
  type: z
    .enum(SEARCH_TABS)
    .catch(DEFAULT_SEARCH_TAB)
    .default(DEFAULT_SEARCH_TAB),
});

export const Route = createFileRoute('/search')({
  validateSearch: (search) => searchRouteSchema.parse(search),
  component: SearchRoute,
  head: () => ({
    meta: [
      ...seo({
        title: 'Search | StoryFun',
        description: 'Search dramas, works, actor IPs, and users on StoryFun.',
      }),
    ],
  }),
});

function SearchRoute() {
  const navigate = useNavigate({ from: Route.fullPath });
  const { q, type } = Route.useSearch();
  const tab = sanitizeSearchTab(type);

  useEffect(() => {
    if (tab === type) {
      return;
    }

    void navigate({
      to: '/search',
      search: { q, type: tab },
      replace: true,
    });
  }, [navigate, q, tab, type]);

  return <SearchView query={q} tab={tab} />;
}
