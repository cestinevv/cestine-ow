import { useTranslation } from 'react-i18next';

import { ContentContainer } from '@/components/common/ContentContainer';
import { cn } from '@/utils';

import { topic1011Media } from '../topic1011Media';

export function Topic1011ClosingSection() {
  const { t } = useTranslation();

  return (
    <section
      className={cn(
        // Layout
        'relative w-full overflow-hidden',
        // Visual
        'bg-topic-1011-surface',
      )}
    >
      <img
        src={topic1011Media.snowflake}
        alt=""
        className="pointer-events-none absolute bottom-10 left-20 hidden size-[68px] md:block"
      />
      <ContentContainer
        className={cn(
          // Layout
          'relative z-10 flex flex-col items-center',
          // Spacing — 移动 pt-8 pb-37；桌面 pt-16 pb-92
          'gap-4 pt-8 pb-[148px]',
          'md:pt-16 md:pb-[92px]',
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
            {t('故事本身 即是火种')}
          </p>
          <h2
            className={cn(
              'w-full text-center font-bold text-foreground',
              'text-lg leading-[26px] tracking-[-0.04px]',
              'md:text-[40px] md:leading-none md:tracking-normal',
            )}
          >
            {t('每一个被认真讲述的真实事件 都不会被遗忘')}
          </h2>
          <p
            className={cn(
              'w-full text-center text-muted-foreground',
              'text-sm leading-5',
              'md:text-xl md:leading-7',
            )}
          >
            {t(
              '在群众上传剧集之前，先有一支 70 秒预告片立起世界观：凛冬、金字塔、冰墙与烛火。它不是结论，而是一句邀请——「接下来的故事，由你们来讲」。',
            )}
          </p>
        </header>
      </ContentContainer>
    </section>
  );
}
