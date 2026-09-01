import { createFileRoute } from '@tanstack/react-router';

import { InviteRecordsView } from '@/features/invite/InviteRecordsView';

export const Route = createFileRoute('/invite/records')({
  component: InviteRecordsView,
});
