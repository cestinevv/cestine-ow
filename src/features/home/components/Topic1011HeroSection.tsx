import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { ContentContainer } from '@/components/common/ContentContainer';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils';

import { topic1011Media } from '../topic1011Media';

export function Topic1011HeroSection() {
  const { t } = useTranslation();

  // 预告片尚未上线，点击提示即将推出
  function handlePlayTrailerClick() {
    toast.info(t('即将推出'));
  }

  return (
    <section
      className={cn(
        // Layout & Positioning
        'relative flex w-full shrink-0 overflow-hidden',
        // Sizing — 移动：可视区 − Header − Footer；桌面：可视区 − Header
        'h-[calc(100svh-var(--site-header-height)-var(--site-mobile-bottom-nav-height))] min-h-[calc(100svh-var(--site-header-height)-var(--site-mobile-bottom-nav-height))] items-center justify-center',
        'md:h-[calc(100svh-var(--site-header-height))] md:min-h-[calc(100svh-var(--site-header-height))] md:items-end md:justify-start',
      )}
    >
      <img
        src={topic1011Media.heroBg}
        alt=""
        className="absolute inset-0 size-full max-w-none object-cover object-bottom"
        style={{ opacity: 'var(--topic-1011-hero-light-opacity)' }}
      />
      {/* Figma 7039:38353 — 深色 Hero 底图 */}
      <img
        src={topic1011Media.heroBgDark}
        alt=""
        className="pointer-events-none absolute inset-0 size-full max-w-none object-cover object-bottom"
        style={{ opacity: 'var(--topic-1011-hero-dark-opacity)' }}
      />
      <div
        className={cn(
          // Layout & Positioning
          'absolute inset-x-0 bottom-0',
          // Sizing
          'h-[280px] md:h-[402px]',
          // Visual
          'bg-gradient-to-b from-transparent to-[rgba(27,35,44,0.6)]',
        )}
      />
      <ContentContainer
        className={cn(
          // Layout & Positioning
          'relative z-10 flex flex-col',
          // Sizing & Spacing — 移动端居中；桌面底对齐左起
          'items-center gap-11 pb-8',
          'md:items-start md:justify-end md:gap-6 md:py-16',
        )}
      >
        <div
          className={cn(
            // Layout
            'flex w-full flex-col',
            // Spacing
            'items-center gap-4',
            'md:items-start md:gap-0',
          )}
        >
          <h1
            className={cn(
              // Visual — 移动 48px；桌面 120px
              'text-center text-[48px] leading-[1.15] font-bold tracking-[-0.12px] text-white text-shadow-[0px_2px_5.5px_rgba(0,0,0,0.63)]',
              'md:text-left md:text-[120px] md:leading-none md:tracking-normal md:text-shadow-none',
            )}
          >
            1011
          </h1>
          <div
            className={cn(
              // Layout
              'flex w-full flex-col',
              // Spacing
              'items-center gap-2',
              'md:mt-0 md:items-start md:gap-3',
            )}
          >
            <p
              className={cn(
                // Visual — 移动 18/26；桌面 30/36
                'text-center text-lg leading-[26px] font-bold tracking-[-0.04px] text-white text-shadow-[0px_1px_2.4px_rgba(0,0,0,0.7)]',
                'md:text-left md:text-[30px] md:leading-9 md:tracking-[-0.12px] md:text-shadow-none',
              )}
            >
              {t('加密凛冬')}
            </p>
            <p
              className={cn(
                // Visual — 移动 16/24；桌面 24/30
                'max-w-full text-center text-base leading-6 font-medium text-white text-shadow-[0px_1px_2.4px_rgba(0,0,0,0.7)]',
                'md:text-left md:text-2xl md:leading-[30px] md:tracking-[-0.1px] md:text-shadow-none',
              )}
            >
              {t('2025 年 10 月 11 日，160 万人归零。凛冬很冷，所幸烛火还在亮')}
            </p>
          </div>
        </div>
        <Button
          type="button"
          onClick={handlePlayTrailerClick}
          className={cn(
            // Layout & Positioning
            'relative h-auto overflow-hidden rounded-full',
            // Spacing — 移动 py-2.5；桌面 h-14
            'px-8 py-2.5 md:h-14 md:px-[42px] md:py-0',
            // Visual — 移动描边半透；桌面磨砂实底
            'border border-white bg-black/15 text-base leading-6 font-normal text-white backdrop-blur-[1.25px]',
            'md:border-0 md:bg-white/30 md:font-bold md:shadow-[0_15px_15px_rgba(0,0,0,0.12)] md:backdrop-blur-[3px]',
            // State
            'hover:bg-black/25 md:hover:bg-white/40',
          )}
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 hidden rounded-full shadow-[inset_-1px_-1px_1px_rgba(255,255,255,0.8),inset_1px_1px_1px_rgba(255,255,255,0.8),inset_-4px_-4px_8px_rgba(0,0,0,0.03),inset_4px_4px_8px_rgba(0,0,0,0.03)] md:block"
          />
          {t('播放预告片')}
        </Button>
      </ContentContainer>
    </section>
  );
}
