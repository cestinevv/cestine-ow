import { useEffect, useState } from 'react';

import { MOBILE_MAX_WIDTH_MEDIA_QUERY } from '@/hooks/useAppBreakpoints';

/** H5 专属能力分界：<md（768.5px）视为移动端视口 */
export function getIsMobileViewport(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.matchMedia(MOBILE_MAX_WIDTH_MEDIA_QUERY).matches;
}

export function useMobileViewport(): boolean {
  const [isMobile, setIsMobile] = useState(getIsMobileViewport);

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_MAX_WIDTH_MEDIA_QUERY);
    const sync = () => {
      setIsMobile(mediaQuery.matches);
    };

    sync();
    mediaQuery.addEventListener('change', sync);
    return () => {
      mediaQuery.removeEventListener('change', sync);
    };
  }, []);

  return isMobile;
}
