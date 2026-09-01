import { useTranslation } from 'react-i18next';

import { useListShareAttempts } from '@/api/__generated__/wallet/activity-share/activity-share';
import type { ShareAttemptListResponse } from '@/api/__generated__/wallet/model/shareAttemptListResponse';
import { SubmitShareAttemptRequestPlatform } from '@/api/__generated__/wallet/model/submitShareAttemptRequestPlatform';
import IconSocialX from '@/assets/svg/IconSocialX';
import AppLoadingContainer from '@/components/common/AppLoadingContainer';
import { unwrapOrvalPayload } from '@/features/mining/miningFormat';
import { useConfigStore } from '@/stores/config';
import useGlobalStore from '@/stores/global';
import { cn } from '@/utils';

import { story1011Media } from '../constants/story1011Media';
import {
  findShareAttemptByPlatform,
  resolveStory1011ActivityConfig,
} from '../utils/story1011Format';
import { Story1011SharePlatformRow } from './Story1011SharePlatformRow';
import { Story1011ShareRulesPanel } from './Story1011ShareRulesPanel';

const SHARE_PLATFORMS = [
  {
    platform: SubmitShareAttemptRequestPlatform.x,
    placeholderKey: '请输入 X 推文链接',
    Icon: IconSocialX,
  },
  {
    platform: SubmitShareAttemptRequestPlatform.tiktok,
    placeholderKey: '请输入 TikTok 链接',
    iconSrc: story1011Media.socialTiktok,
  },
  {
    platform: SubmitShareAttemptRequestPlatform.youtube,
    placeholderKey: '请输入 YouTube 视频链接',
    iconSrc: story1011Media.socialYoutube,
  },
] as const;

const READY_SENTINEL = [true] as const;

type Story1011ShareSectionProps = {
  /** 嵌入外层合并卡片时去掉自身 section 描边与区块标题 */
  embedded?: boolean;
};

export function Story1011ShareSection({
  embedded = false,
}: Story1011ShareSectionProps) {
  const { t } = useTranslation();
  const isLogin = useGlobalStore((state) => state.isLogin);
  const activityConfig = useConfigStore((state) => state.activityConfig);
  const activityId = resolveStory1011ActivityConfig(activityConfig)?.activityId;
  const shareQuery = useListShareAttempts(activityId ?? 0, {
    query: { enabled: isLogin && activityId != null },
  });
  const shareData = unwrapOrvalPayload<ShareAttemptListResponse>(
    shareQuery.data,
  );

  const content = (
    <AppLoadingContainer
      data={shareQuery.isPending ? [] : READY_SENTINEL}
      isLoading={shareQuery.isPending}
      isError={shareQuery.isError}
      minHeight={200}
      scrollable={false}
    >
      <div className="flex w-full flex-col gap-6">
        {embedded ? null : (
          <div className="flex flex-col gap-2">
            <h2 className="m-0 text-lg leading-6.5 font-bold tracking-[-0.04px] text-foreground">
              {t('分享故事')}
            </h2>
            <p className="m-0 text-xs leading-4 tracking-[0.04px] text-muted-foreground">
              {t(
                '将你的故事分享到社交平台，提交链接即可获得验证码，写入内容简介完成验证。',
              )}
            </p>
            <p
              className={cn(
                'm-0 rounded px-4 py-2 text-sm leading-5',
                'bg-story-checkin-accent/5 text-story-checkin-accent',
              )}
            >
              {t('活动结束时根据传播数据获得积分')}
            </p>
          </div>
        )}

        <div className="flex w-full flex-col gap-6 lg:flex-row lg:items-stretch lg:gap-8">
          <ul className="m-0 flex min-w-0 w-full flex-1 list-none flex-col gap-3 p-0">
            {SHARE_PLATFORMS.map((item) => {
              const attempt = findShareAttemptByPlatform(
                shareData?.shareAttempts,
                item.platform,
              );

              return (
                <li
                  key={`${item.platform}-${attempt?.attemptId ?? 'empty'}-${attempt?.status ?? 'none'}`}
                >
                  <Story1011SharePlatformRow
                    platform={item.platform}
                    placeholderKey={item.placeholderKey}
                    Icon={'Icon' in item ? item.Icon : undefined}
                    iconSrc={'iconSrc' in item ? item.iconSrc : undefined}
                    attempt={attempt}
                  />
                </li>
              );
            })}
          </ul>

          <Story1011ShareRulesPanel
            rulesByPlatform={shareData?.metricsPointsRules}
          />
        </div>
      </div>
    </AppLoadingContainer>
  );

  if (embedded) {
    return <div className="flex w-full flex-col">{content}</div>;
  }

  return (
    <section
      className={cn(
        'flex w-full flex-col gap-6 rounded-xl border border-story-checkin-accent/16 bg-card p-6',
      )}
    >
      {content}
    </section>
  );
}
