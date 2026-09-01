import { createFileRoute } from '@tanstack/react-router';

import { AppLoginPromptGate } from '@/components/AppLoginPromptGate';
import { CreateView } from '@/features/create/CreateView';

export const Route = createFileRoute('/create')({
  component: CreateRouteGuard,
});

function CreateRouteGuard() {
  return (
    <AppLoginPromptGate>
      <CreateView />
    </AppLoginPromptGate>
  );
}
