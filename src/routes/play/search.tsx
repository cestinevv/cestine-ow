import { createFileRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';

const legacySearchSchema = z.object({
  q: z.string().trim().max(50).optional().catch(undefined),
});

export const Route = createFileRoute('/play/search')({
  validateSearch: (search) => legacySearchSchema.parse(search),
  beforeLoad: ({ search }) => {
    throw redirect({
      to: '/search',
      search: { q: search.q, type: 'drama' },
      replace: true,
    });
  },
});
