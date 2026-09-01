import { useTheme } from 'next-themes';
import type { CSSProperties } from 'react';

import type { MyRankResponse } from '@/api/__generated__/wallet/model/myRankResponse';
import { ContentContainer } from '@/components/common/ContentContainer';
import { useConfigStore } from '@/stores/config';
import { cn } from '@/utils';

import { Story1011ActivityEndedBanner } from './components/Story1011ActivityEndedBanner';
import { Story1011BoardedHero } from './components/Story1011BoardedHero';
import { Story1011BoardedTabSection } from './components/Story1011BoardedTabSection';
import { Story1011CheckinSection } from './components/Story1011CheckinSection';
import { Story1011LeaderboardSection } from './components/Story1011LeaderboardSection';
import { Story1011ShareSection } from './components/Story1011ShareSection';
import { Story1011TasksSection } from './components/Story1011TasksSection';
import {
  getStory1011HeroUrl,
  story1011BoardedPageBackgroundStyle,
} from './constants/story1011Media';
import {
  isStory1011ActivityEnded,
  resolveStory1011ActivityConfig,
} from './utils/story1011Format';

type Story1011BoardedViewProps = {
  myRank: MyRankResponse | undefined;
};

export function Story1011BoardedView({ myRank }: Story1011BoardedViewProps) {
  const { resolvedTheme } = useTheme();
  const activityConfig = useConfigStore((state) => state.activityConfig);
  const story1011ActivityConfig =
    resolveStory1011ActivityConfig(activityConfig);
  const isActivityEnded = isStory1011ActivityEnded(
    story1011ActivityConfig?.activityEndAt,
  );

  // 浅色 / 深色分图注入 --story-checkin-hero-url（Figma 6962:37865 深色底）
  const boardedPageStyle = {
    ...story1011BoardedPageBackgroundStyle,
    ['--story-checkin-hero-url' as string]: `url(${getStory1011HeroUrl(resolvedTheme === 'dark')})`,
  } as CSSProperties;

  return (
    <div
      className={cn(
        'relative flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-y-auto',
      )}
      style={boardedPageStyle}
    >
      <div className="relative z-10 flex w-full flex-col">
        <div className="hidden lg:block">
          <ContentContainer className="flex flex-col gap-6 py-6 lg:pt-8 lg:pb-10">
            <div className="flex w-full flex-col gap-6 lg:flex-row lg:items-stretch">
              <Story1011BoardedHero totalPoints={myRank?.totalPoints} />
              <Story1011LeaderboardSection myRank={myRank} />
            </div>

            {!isActivityEnded ? (
              <>
                <Story1011CheckinSection />
                <Story1011TasksSection />
                <Story1011ShareSection />
              </>
            ) : (
              <Story1011ActivityEndedBanner />
            )}
          </ContentContainer>
        </div>

        <div className="flex flex-col lg:hidden">
          <ContentContainer
            className={cn('relative flex flex-col gap-3 overflow-hidden py-4')}
          >
            <div className="relative z-10 flex flex-col gap-3">
              <Story1011BoardedHero totalPoints={myRank?.totalPoints} />
              {!isActivityEnded ? <Story1011CheckinSection embedded /> : null}
            </div>
          </ContentContainer>

          <Story1011BoardedTabSection
            myRank={myRank}
            isActivityEnded={isActivityEnded}
          />

          {isActivityEnded ? (
            <ContentContainer className="flex flex-col py-4">
              <Story1011ActivityEndedBanner />
            </ContentContainer>
          ) : null}
        </div>
      </div>
    </div>
  );
}
