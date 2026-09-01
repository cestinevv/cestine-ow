import { useEffect, useState } from 'react';

import IconBackToTop from '@/assets/svg/IconBackToTop';
import { cn } from '@/utils';

const SCROLL_THRESHOLD_PX = 300;

export function BackToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      setIsVisible(window.scrollY > SCROLL_THRESHOLD_PX);
    };

    window.addEventListener('scroll', toggleVisibility, { passive: true });
    toggleVisibility();

    return () => {
      window.removeEventListener('scroll', toggleVisibility);
    };
  }, []);

  const handleScrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  if (!isVisible) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={handleScrollToTop}
      aria-label="返回顶部"
      className={cn(
        // Layout & Positioning
        'fixed right-5 bottom-24 z-50 md:right-10 md:bottom-10',
        // Sizing & Spacing
        'flex size-12 items-center justify-center',
        // Visuals & Typography
        'rounded-full border border-border bg-background/80 text-foreground shadow-lg backdrop-blur-sm',
        // Interactions & States
        'cursor-pointer transition-opacity hover:opacity-80 active:scale-95',
      )}
    >
      <IconBackToTop className="size-6 shrink-0" />
    </button>
  );
}
