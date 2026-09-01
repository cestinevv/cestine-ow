import { useTranslation } from 'react-i18next';

import { useConfigStore } from '@/stores/config';
import { cn } from '@/utils';

import {
  formatStory1011DeadlineDate,
  formatStory1011RewardRange,
  getStory1011RewardBoundsFromRankTiers,
  resolveStory1011ActivityConfig,
} from '../utils/story1011Format';

export function Story1011Intro() {
  const { t } = useTranslation();
  const activityConfig = useConfigStore((state) => state.activityConfig);
  const story1011ActivityConfig =
    resolveStory1011ActivityConfig(activityConfig);
  const deadlineDate = formatStory1011DeadlineDate(
    story1011ActivityConfig?.activityEndAt,
  );
  const rewardBounds = getStory1011RewardBoundsFromRankTiers(
    story1011ActivityConfig?.rewardRankTiers,
  );
  const rewardRange = formatStory1011RewardRange(
    rewardBounds?.minRewardAmount,
    rewardBounds?.maxRewardAmount,
  );

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <h2
          className={cn(
            'm-0 text-[32px] leading-9 font-bold tracking-[-0.1px] text-foreground',
            'lg:text-[40px] lg:leading-9',
          )}
        >
          {t('写下你的1011故事')}
        </h2>
        <span
          className={cn(
            'rounded-sm px-1.5 py-1',
            'bg-story-checkin-chip-bg text-sm leading-5 font-medium text-story-checkin-chip-text',
          )}
        >
          {t('写故事 · 登方舟')}
        </span>
      </div>

      <p className="m-0 text-sm leading-5 text-muted-foreground">
        {t(
          '2025.10.11 加密市场史诗级清算，杠杆风暴席卷全网。无数交易者亲历剧烈波动，这一天被 Web3 社区称为 「1011」。',
        )}
      </p>

      <ul className="m-0 flex list-none flex-col gap-3 p-0 lg:flex-row lg:gap-6">
        <li className="flex items-center gap-2">
          <span className="size-1.5 shrink-0 bg-story-checkin-chip-text" />
          <span className="text-base leading-6 font-medium text-foreground">
            {t('截止 {{date}}', { date: deadlineDate ?? '-' })}
          </span>
        </li>
        <li className="flex items-center gap-2">
          <span className="size-1.5 shrink-0 bg-story-checkin-chip-text" />
          <span className="text-base leading-6 font-medium text-foreground">
            {rewardRange === undefined
              ? t('按最终积分排名发放 -')
              : t('按最终积分排名发放 {{min}} ~ {{max}}', rewardRange)}
          </span>
        </li>
      </ul>
    </div>
  );
}
