import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { MyRankResponse } from '@/api/__generated__/wallet/model/myRankResponse';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/utils';

import { Story1011BoardedTab } from '../utils/story1011Format';
import { Story1011LeaderboardSection } from './Story1011LeaderboardSection';
import { Story1011ShareSection } from './Story1011ShareSection';
import { Story1011TasksSection } from './Story1011TasksSection';

const BOARDED_TAB_ITEMS = [
  { value: Story1011BoardedTab.Tasks, labelKey: '做任务赚积分' },
  { value: Story1011BoardedTab.Share, labelKey: '分享故事' },
  { value: Story1011BoardedTab.Leaderboard, labelKey: '排行榜' },
] as const;

type Story1011BoardedTabSectionProps = {
  myRank: MyRankResponse | undefined;
  isActivityEnded?: boolean;
};

export function Story1011BoardedTabSection({
  myRank,
  isActivityEnded = false,
}: Story1011BoardedTabSectionProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<string>(Story1011BoardedTab.Tasks);

  function handleTabChange(value: string) {
    setActiveTab(value);
  }

  if (isActivityEnded) {
    return (
      <section className="flex w-full flex-col bg-card p-4">
        <Story1011LeaderboardSection embedded myRank={myRank} />
      </section>
    );
  }

  return (
    <section className="flex w-full flex-col bg-card">
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="flex w-full flex-col bg-card"
      >
        <div className="w-full border-b border-border bg-card px-4">
          <TabsList
            variant="line"
            className={cn(
              'flex h-auto w-full min-w-0 items-end justify-start gap-5 rounded-none border-0 bg-transparent p-0 pt-2.5',
            )}
          >
            {BOARDED_TAB_ITEMS.map((item) => (
              <TabsTrigger
                key={item.value}
                value={item.value}
                className={cn(
                  'flex-none px-0 pb-2 text-base leading-6 font-normal text-muted-foreground',
                  'data-active:font-bold data-active:text-foreground',
                )}
              >
                {t(item.labelKey)}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent
          value={Story1011BoardedTab.Tasks}
          className="mt-0 flex flex-col gap-6 bg-card p-4"
        >
          <Story1011TasksSection embedded />
        </TabsContent>

        <TabsContent
          value={Story1011BoardedTab.Share}
          className="mt-0 flex flex-col gap-6 bg-card p-4"
        >
          <Story1011ShareSection embedded />
        </TabsContent>

        <TabsContent
          value={Story1011BoardedTab.Leaderboard}
          className="mt-0 flex flex-col gap-6 bg-card p-4"
        >
          <Story1011LeaderboardSection embedded myRank={myRank} />
        </TabsContent>
      </Tabs>
    </section>
  );
}
