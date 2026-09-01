import { createFileRoute, Outlet } from '@tanstack/react-router';

import { AppLoginPromptGate } from '@/components/AppLoginPromptGate';
import { guardDevOnlyRouteIfDisabled } from '@/routing/tempNavGate';

export const Route = createFileRoute('/invite')({
  beforeLoad: () => {
    guardDevOnlyRouteIfDisabled();
  },
  component: InviteRouteGuard,
});

function InviteRouteGuard() {
  return (
    <AppLoginPromptGate>
      <Outlet />
    </AppLoginPromptGate>
  );
}
