import AOS from 'aos';
import { useEffect } from 'react';
import { WhitepaperBodySection } from './components/WhitepaperBodySection';
import { WhitepaperHeroSection } from './components/WhitepaperHeroSection';

const WHITEPAPER_HERO_SHELL_CLASS =
  'relative h-[calc(100svh-var(--site-header-height)-var(--site-mobile-bottom-nav-height))] min-h-[calc(100svh-var(--site-header-height)-var(--site-mobile-bottom-nav-height))] md:h-[calc(100svh-var(--site-header-height))] md:min-h-[calc(100svh-var(--site-header-height))] w-full shrink-0 overflow-hidden';

export function WhitepaperView() {
  useEffect(() => {
    AOS.init({
      duration: 800,
      easing: 'ease-out',
      once: true,
      offset: 50,
    });
  }, []);

  return (
    <article className="flex w-full flex-col overflow-x-clip">
      <div className={WHITEPAPER_HERO_SHELL_CLASS} data-whitepaper-hero-shell>
        <WhitepaperHeroSection />
      </div>
      <WhitepaperBodySection />
    </article>
  );
}
