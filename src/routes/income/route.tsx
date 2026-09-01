import { createFileRoute, Outlet } from '@tanstack/react-router';

import { AppLoginPromptGate } from '@/components/AppLoginPromptGate';
import { guardDevOnlyRouteIfDisabled } from '@/routing/tempNavGate';

export const Route = createFileRoute('/income')({
  beforeLoad: () => {
    guardDevOnlyRouteIfDisabled();
  },
  component: IncomeRouteGuard,
});

function IncomeRouteGuard() {
  return (
    <AppLoginPromptGate>
      <Outlet />
    </AppLoginPromptGate>
  );
}
