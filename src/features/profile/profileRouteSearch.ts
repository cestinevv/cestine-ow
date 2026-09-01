import { z } from 'zod';

import {
  type ProfileFavoriteType,
  ProfilePageTab,
} from '@/features/profile/components/ProfileDramaTabPanel';

const profilePageTabValues = [
  ProfilePageTab.Dramas,
  ProfilePageTab.Works,
  ProfilePageTab.ActorIp,
  ProfilePageTab.Likes,
  ProfilePageTab.Favorites,
  ProfilePageTab.History,
] as const;

export const profileRouteSearchSchema = z.object({
  tab: z.enum(profilePageTabValues).optional().catch(undefined),
  favorite: z.enum(['SHORT_DRAMA', 'SHORT_VIDEO']).optional().catch(undefined),
});

export type ProfileRouteSearch = z.infer<typeof profileRouteSearchSchema>;

export function parseProfileRouteSearch(
  search: Record<string, unknown>,
): ProfileRouteSearch {
  return profileRouteSearchSchema.parse(search);
}

import { SHOW_DEV_ONLY_UI } from '@/utils';

export function resolveProfileActiveTab(
  tab: ProfileRouteSearch['tab'],
): ProfilePageTab {
  if (tab === ProfilePageTab.Works || tab === ProfilePageTab.Likes) {
    return tab;
  }

  if (tab === ProfilePageTab.Favorites) {
    return tab;
  }

  if (tab === ProfilePageTab.History) {
    return tab;
  }

  if (tab === ProfilePageTab.ActorIp) {
    return SHOW_DEV_ONLY_UI ? tab : ProfilePageTab.Dramas;
  }

  return ProfilePageTab.Dramas;
}

export function resolveProfileFavoriteType(
  favorite: ProfileRouteSearch['favorite'],
): ProfileFavoriteType {
  return favorite === 'SHORT_VIDEO' ? 'SHORT_VIDEO' : 'SHORT_DRAMA';
}

function normalizeProfileRouteSearch(
  search: ProfileRouteSearch,
): ProfileRouteSearch {
  const next: ProfileRouteSearch = {};

  if (search.tab && search.tab !== ProfilePageTab.Dramas) {
    next.tab = search.tab;
  }

  if (
    search.tab === ProfilePageTab.Favorites &&
    search.favorite === 'SHORT_VIDEO'
  ) {
    next.favorite = 'SHORT_VIDEO';
  }

  return next;
}

export function buildProfileTabSearch(
  prev: ProfileRouteSearch,
  tab: ProfilePageTab,
): ProfileRouteSearch {
  const next: ProfileRouteSearch = { ...prev };

  if (tab === ProfilePageTab.Dramas) {
    delete next.tab;
    delete next.favorite;
    return normalizeProfileRouteSearch(next);
  }

  next.tab = tab;

  if (tab !== ProfilePageTab.Favorites) {
    delete next.favorite;
  }

  return normalizeProfileRouteSearch(next);
}

export function buildProfileFavoriteSearch(
  prev: ProfileRouteSearch,
  favoriteType: ProfileFavoriteType,
): ProfileRouteSearch {
  const next: ProfileRouteSearch = {
    ...prev,
    tab: ProfilePageTab.Favorites,
  };

  if (favoriteType === 'SHORT_VIDEO') {
    next.favorite = 'SHORT_VIDEO';
  } else {
    delete next.favorite;
  }

  return normalizeProfileRouteSearch(next);
}

export function isProfilePageTab(value: string): value is ProfilePageTab {
  return (profilePageTabValues as readonly string[]).includes(value);
}
