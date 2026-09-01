import { useTranslation } from 'react-i18next';

import IconStory1011ActivityEnded from '@/assets/svg/IconStory1011ActivityEnded';
import { cn } from '@/utils';

/** Figma 7350:40248 — 活动结束态底部提示卡片 */
export function Story1011ActivityEndedBanner() {
  const { t } = useTranslation();

  return (
    <section
      className={cn(
        // Layout & Positioning
        'flex w-full flex-col items-center justify-center',
        // Sizing & Spacing — Figma h-246 / p-24 / gap-16
        'min-h-48 gap-4 p-6 md:min-h-[246px]',
        // Visual
        'rounded-xl border border-story-checkin-accent/16 bg-card',
      )}
    >
      <IconStory1011ActivityEnded className="size-12 shrink-0 text-foreground" />
      <p className="m-0 text-center text-lg leading-[26px] font-bold tracking-[-0.04px] text-foreground">
        {t('活动已结束')}
      </p>
    </section>
  );
}
