import { createFileRoute } from '@tanstack/react-router';

import { AppLoginPromptGate } from '@/components/AppLoginPromptGate';
import { GameView } from '@/features/game/GameView';
import { guardDevOnlyRouteIfDisabled } from '@/routing/tempNavGate';
import { seo } from '@/utils';

export const Route = createFileRoute('/game')({
  beforeLoad: () => {
    guardDevOnlyRouteIfDisabled();
  },
  component: GameRouteGuard,
  head: () => ({
    meta: [
      ...seo({
        title: 'Agent | StoryFun',
        description: 'Manage your roles and dispatch them to earn rewards.',
      }),
    ],
  }),
});

function GameRouteGuard() {
  return (
    <AppLoginPromptGate>
      <GameView />
    </AppLoginPromptGate>
  );
}
