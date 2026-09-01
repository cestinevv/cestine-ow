import { useMemo } from 'react';

import { resolveTheaterBannerItems } from '@/features/play/types/playTheaterBannerItem';
import { useConfigStore } from '@/stores/config';

export function useTheaterBannerItems(limit = 10) {
  const theaterBannerConfig = useConfigStore(
    (state) => state.theaterBannerConfig,
  );

  const featuredBannerItems = useMemo(
    () => resolveTheaterBannerItems(theaterBannerConfig, limit),
    [limit, theaterBannerConfig],
  );

  const isBannerEnabled = theaterBannerConfig?.enabled === true;
  const isBannerExplicitlyDisabled = theaterBannerConfig?.enabled === false;

  return {
    featuredBannerItems,
    isBannerEnabled,
    isBannerExplicitlyDisabled,
  };
}
