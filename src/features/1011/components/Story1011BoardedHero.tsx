import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useConfigStore } from '@/stores/config';
import useGlobalStore from '@/stores/global';
import { cn } from '@/utils';

import { story1011Media } from '../constants/story1011Media';
import {
  formatStory1011DeadlineDate,
  formatStory1011RewardRange,
  getStory1011RewardBoundsFromRankTiers,
  isStory1011ActivityEnded,
  resolveStory1011ActivityConfig,
} from '../utils/story1011Format';
import { Story1011HeroPointsButton } from './Story1011HeroPointsButton';
import { Story1011PointsLedgerDialog } from './Story1011PointsLedgerDialog';
import { Story1011TwitterBindButton } from './Story1011TwitterBindButton';

type Story1011BoardedHeroProps = {
  totalPoints: number | undefined;
};

export function Story1011BoardedHero({
  totalPoints,
}: Story1011BoardedHeroProps) {
  const { t } = useTranslation();
  const isLogin = useGlobalStore((state) => state.isLogin);
  const [pointsLedgerOpen, setPointsLedgerOpen] = useState(false);
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
  const isActivityEnded = isStory1011ActivityEnded(
    story1011ActivityConfig?.activityEndAt,
  );

  /** 打开积分流水弹窗 */
  function handleOpenPointsLedger() {
    if (!isLogin) {
      return;
    }

    setPointsLedgerOpen(true);
  }

  return (
    <>
      <section
        className={cn(
          // Layout & Positioning
          'relative hidden min-h-[280px] flex-1 flex-col justify-center overflow-hidden lg:flex',
          // Sizing & Spacing
          'gap-4 rounded-xl border border-story-checkin-accent px-6 py-8 lg:min-h-[320px] lg:gap-4 lg:px-11 lg:py-8',
        )}
      >
        <img
          src={story1011Media.boardedHero}
          alt=""
          className="pointer-events-none absolute inset-0 size-full rounded-xl object-cover"
          style={{ opacity: 'var(--story-checkin-hero-light-opacity)' }}
        />
        {/* Figma 6962:46844 — 深色夜间方舟底图 */}
        <img
          src={story1011Media.boardedHeroDark}
          alt=""
          className="pointer-events-none absolute inset-0 size-full rounded-xl object-cover"
          style={{ opacity: 'var(--story-checkin-hero-dark-opacity)' }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-xl"
          style={{
            backgroundImage: 'var(--story-checkin-boarded-hero-overlay)',
          }}
        />

        {/* 磨砂信息卡 — 浅 7785:94313 / 深 7785:94247 */}
        <div
          className={cn(
            // Layout & Positioning
            'relative z-10 flex w-fit max-w-full flex-col items-start',
            // Sizing & Spacing
            'gap-4 rounded p-6',
            // Visuals & Typography
            'bg-story-checkin-hero-panel backdrop-blur-[2.5px]',
          )}
        >
          <div className="flex w-full flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <h2
                className={cn(
                  'm-0 text-[36px] leading-none font-bold tracking-[-0.12px] lg:text-[72px]',
                  'onestory-text-gradient',
                )}
              >
                {t('诺亚方舟')}
              </h2>
              <span
                className={cn(
                  'inline-flex items-center justify-center',
                  'rounded-lg px-1.5 py-1',
                  'bg-story-checkin-accent text-xs leading-4 font-medium tracking-[0.04px] text-primary-foreground',
                )}
              >
                {t('成功登船')}
              </span>
            </div>

            <Story1011HeroPointsButton
              totalPoints={totalPoints}
              onClick={handleOpenPointsLedger}
              variant="chip"
            />
          </div>

          {isActivityEnded ? (
            <>
              <p className="m-0 text-base leading-6 text-foreground">
                {t('感谢参与 1011 · 诺亚方舟')}
              </p>
              <div className="flex items-center gap-1">
                <span className="size-2 shrink-0 rounded-full bg-destructive" />
                <span className="text-base leading-6 text-foreground">
                  {t('活动已结束，奖励正按榜单发放中')}
                </span>
              </div>
            </>
          ) : (
            <>
              <p className="m-0 text-base leading-6 text-foreground">
                {t('继续完成任务赢取积分，提升最终排名')}
              </p>

              <div className="flex flex-wrap items-center gap-4 drop-shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
                <div className="flex items-center gap-1">
                  <span className="size-2 shrink-0 rounded-full bg-story-checkin-accent" />
                  <span className="text-base leading-6 text-foreground">
                    {t('截止 {{date}}', { date: deadlineDate ?? '-' })}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="size-2 shrink-0 rounded-full bg-story-checkin-accent" />
                  <span className="text-base leading-6 text-foreground">
                    {rewardRange === undefined
                      ? t('按最终积分排名发放 -')
                      : t('按最终积分排名发放 {{min}} ~ {{max}}', rewardRange)}
                  </span>
                </div>
              </div>
            </>
          )}

          {isLogin ? <Story1011TwitterBindButton variant="hero" /> : null}
        </div>
      </section>

      {/* `<lg` 磨砂信息卡 — H5 7064:82334 / 1024H5 7169:30617 */}
      <div
        className={cn(
          // Layout & Positioning
          'relative z-10 flex w-full flex-col items-start lg:hidden',
          // Sizing & Spacing — H5 rounded-xl；1024 稿 rounded 4px
          'gap-3 rounded-xl p-4 md:w-fit md:rounded',
          // Visuals & Typography
          'bg-story-checkin-hero-panel backdrop-blur-[2.5px]',
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          <h2
            className={cn(
              'm-0 text-[32px] leading-none font-bold tracking-[-0.12px]',
              'onestory-text-gradient',
            )}
          >
            {t('诺亚方舟')}
          </h2>
          <span
            className={cn(
              'inline-flex items-center justify-center rounded-lg px-1.5 py-1',
              'bg-story-checkin-accent text-xs leading-4 font-medium tracking-[0.04px] text-primary-foreground',
            )}
          >
            {t('成功登船')}
          </span>
        </div>

        <Story1011HeroPointsButton
          totalPoints={totalPoints}
          onClick={handleOpenPointsLedger}
          variant="chip"
        />

        {isActivityEnded ? (
          <div className="flex flex-col gap-2">
            <p className="m-0 text-xs leading-4 tracking-[0.04px] text-foreground">
              {t('感谢参与 1011 · 诺亚方舟')}
            </p>
            <div className="flex items-center gap-1">
              <span className="size-2 shrink-0 rounded-full bg-destructive" />
              <span className="text-xs leading-4 tracking-[0.04px] text-foreground">
                {t('活动已结束，奖励正按榜单发放中')}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1">
              <span className="size-2 shrink-0 rounded-full bg-story-checkin-accent" />
              <span className="text-xs leading-4 tracking-[0.04px] text-foreground">
                {t('截止 {{date}}', { date: deadlineDate ?? '-' })}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="size-2 shrink-0 rounded-full bg-story-checkin-accent" />
              <span className="text-xs leading-4 tracking-[0.04px] text-foreground">
                {rewardRange === undefined
                  ? t('按最终积分排名发放 -')
                  : t('按最终积分排名发放 {{min}} ~ {{max}}', rewardRange)}
              </span>
            </div>
          </div>
        )}

        {isLogin ? <Story1011TwitterBindButton variant="hero" /> : null}
      </div>

      <Story1011PointsLedgerDialog
        open={pointsLedgerOpen}
        onOpenChange={setPointsLedgerOpen}
      />
    </>
  );
}
