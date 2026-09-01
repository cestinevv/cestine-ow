import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import backgroundImage from '@/assets/image/whitepaper/whitepaper-bg.png';
import IconLogoText from '@/assets/svg/IconLogoText';
import { ContentContainer } from '@/components/common/ContentContainer';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils';

export function WhitepaperHeroSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // 跳转平台资金看板
  function handleOpenDashboard() {
    void navigate({ to: '/dashboard' });
  }

  return (
    <section
      className={cn(
        // Layout & Positioning
        'relative flex h-full w-full items-center justify-center overflow-hidden',
        // Visual — 浅白 / 深黑（Figma 2005:202293）
        'bg-whitepaper-hero-bg',
      )}
    >
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-whitepaper-hero-bg" />
        <img
          alt=""
          className="absolute size-full max-w-none object-cover"
          decoding="async"
          src={backgroundImage}
          style={{ opacity: 'var(--whitepaper-hero-texture-opacity)' }}
        />
      </div>

      <ContentContainer
        className={cn(
          // Layout & Positioning
          'relative z-10 flex flex-col items-center text-center',
          // Spacing — Figma gap 16px；桌面水平留白 88px
          'gap-4 md:px-[88px] lg:px-[88px]',
        )}
      >
        <IconLogoText className="hidden h-[30px] w-auto shrink-0 md:block" />

        <h1
          className={cn(
            'w-full min-w-0 shrink-0 text-center font-bold text-whitepaper-hero-foreground',
            'text-[32px] leading-[1.15] tracking-[-0.12px] md:text-[56px] md:leading-[1.3]',
          )}
          suppressHydrationWarning
        >
          {t('StoryFun 白皮书')}
        </h1>

        <Button
          type="button"
          className={cn(
            // Layout & Spacing
            'rounded-full px-8 py-2.5',
            // Visual — 浅色黑底白字 / 深色白底黑字（Figma 2005:202297）
            'border-0 bg-whitepaper-hero-cta text-sm font-bold text-whitepaper-hero-cta-foreground shadow-sm',
            // State
            'transition hover:bg-whitepaper-hero-cta hover:text-whitepaper-hero-cta-foreground hover:opacity-90',
          )}
          onClick={handleOpenDashboard}
        >
          {t('平台资金看板')}
        </Button>
      </ContentContainer>
    </section>
  );
}
