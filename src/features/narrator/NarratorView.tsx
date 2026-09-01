import { Outlet, useRouterState } from '@tanstack/react-router';

import { ContentContainer } from '@/components/common/ContentContainer';
import { cn } from '@/utils';

import { ManagementSection } from './components/ManagementSection';
import { OverviewSection } from './components/OverviewSection';

export function NarratorView() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isCreateActorChild = pathname.startsWith('/narrator/create-actor');

  if (isCreateActorChild) {
    return <Outlet />;
  }

  return (
    <main
      className={cn(
        // Layout & Positioning
        'flex min-h-0 w-full min-w-0 flex-1 flex-col',
        // Visual
        'bg-points-page-surface-muted',
      )}
    >
      <ContentContainer className="py-6 md:py-8">
        <section className="flex w-full flex-col gap-6 md:gap-8">
          <OverviewSection />
          <ManagementSection />
        </section>
      </ContentContainer>
    </main>
  );
}
