import { useTranslation } from 'react-i18next';

import { ContentContainer } from '@/components/common/ContentContainer';
import { cn } from '@/utils';

import { DashboardMobileHeader } from './components/DashboardMobileHeader';
import { DashboardOverviewCards } from './components/DashboardOverviewCards';
import { DashboardStoryReleaseSection } from './components/DashboardStoryReleaseSection';
import { DashboardUsdcIncomeSection } from './components/DashboardUsdcIncomeSection';
import { DashboardVaultSection } from './components/DashboardVaultSection';

export function DashboardView() {
  const { t } = useTranslation();

  return (
    <main
      className={cn(
        // Layout & Positioning
        'flex min-h-0 w-full min-w-0 flex-1 flex-col',
        // Spacing
        'pb-0 md:pb-0',
        // Visual — 与创作中心一致的浅灰页底
        'bg-points-page-surface-muted',
      )}
    >
      <DashboardMobileHeader />
      <ContentContainer className="flex flex-col gap-6 py-4 md:gap-10 md:py-8">
        <header className="hidden md:block">
          <h1
            className={cn(
              'font-bold tracking-[-0.68px] text-foreground',
              'text-[28px] leading-9 md:text-[36px] md:leading-[44px]',
            )}
          >
            {t('平台资金看板')}
          </h1>
        </header>

        <DashboardOverviewCards />
        <DashboardUsdcIncomeSection />
        <DashboardVaultSection />
        <DashboardStoryReleaseSection />
      </ContentContainer>
    </main>
  );
}
