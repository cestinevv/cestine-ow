import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import IconTopic1011Check from '@/assets/svg/IconTopic1011Check';
import { ContentContainer } from '@/components/common/ContentContainer';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils';

const FEATURES = [
  {
    titleKey: '链上存证',
    descKey: '—— 讲出来的故事永远存在，无人可夺走',
  },
  {
    titleKey: '代币激励',
    descKey: '—— 创作者直接获益，不再被平台抽走 30–55%',
  },
  {
    titleKey: 'NFT 身份',
    descKey: '—— 「我是 1011 亲历者」变成可验证的凭证',
  },
  {
    titleKey: '大奖赛',
    descKey: '—— 全球创作者大奖赛 + 评审节目承接创作需求',
  },
] as const;

export function Topic1011ArkSection() {
  const { t } = useTranslation();

  // 方舟计划详情尚未上线，点击提示即将推出
  function handleViewMoreClick() {
    toast.info(t('即将推出'));
  }

  return (
    <section
      className={cn(
        // Layout
        'relative w-full overflow-hidden',
        // Visual
        'bg-topic-1011-surface',
      )}
    >
      <ContentContainer
        className={cn(
          // Layout
          'relative z-10 flex flex-col items-center',
          // Spacing — 移动 py-8 gap-4；桌面 gap-16 py-16
          'gap-4 py-8',
          'md:gap-16 md:py-16',
        )}
      >
        <header className="flex w-full flex-col items-center gap-3 md:gap-4">
          <p
            className={cn(
              'w-full text-center font-bold text-foreground',
              'text-sm leading-5',
              'md:text-xl md:leading-7 md:font-medium',
            )}
          >
            {t('特别计划')}
          </p>
          <h2
            className={cn(
              'w-full text-center font-bold text-foreground',
              'text-lg leading-[26px] tracking-[-0.04px]',
              'md:text-[40px] md:leading-none md:tracking-normal',
            )}
          >
            {t('一世界诺亚方舟计划')}
          </h2>
          <Button
            type="button"
            onClick={handleViewMoreClick}
            className={cn(
              // Layout
              'h-auto rounded-full md:h-11',
              // Spacing
              'px-4 py-2.5 md:py-0',
              // Visual
              'bg-topic-1011-cta text-sm leading-5 font-bold text-topic-1011-cta-foreground',
              // State
              'hover:opacity-90',
            )}
          >
            {t('查看更多')}
          </Button>
        </header>

        <ul className="grid w-full grid-cols-1 gap-3 md:grid-cols-4 md:gap-4">
          {FEATURES.map((feature) => (
            <li
              key={feature.titleKey}
              className={cn(
                // Layout
                'flex flex-col items-start rounded-3xl',
                // Spacing
                'gap-4 p-6',
                // Visual
                'bg-card',
              )}
            >
              <div className="flex size-11 items-center justify-center rounded-xl bg-muted">
                {/* Figma 7039:38559 — 深色：#111113 盘 + 浅勾；浅色保持白盘深勾 */}
                <IconTopic1011Check className="size-6" />
              </div>
              <div className="flex w-full flex-col gap-1">
                <h3
                  className={cn(
                    'font-medium text-foreground',
                    // 移动稿 20/28；桌面同档
                    'text-xl leading-7 tracking-[-0.08px]',
                  )}
                >
                  {t(feature.titleKey)}
                </h3>
                <p
                  className={cn('text-muted-foreground', 'text-base leading-6')}
                >
                  {t(feature.descKey)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </ContentContainer>
    </section>
  );
}
