import type { listActorCollectionsResponse } from '@/api/__generated__/story/actor-i-p/actor-i-p';
import type { DramasParams } from '@/api/__generated__/story/model/dramasParams';
import type { FavoritesParams } from '@/api/__generated__/story/model/favoritesParams';
import type { LikesParams } from '@/api/__generated__/story/model/likesParams';
import type { ListActorCollectionsParams } from '@/api/__generated__/story/model/listActorCollectionsParams';
import type { WorksParams } from '@/api/__generated__/story/model/worksParams';
import type {
  dramasResponse,
  favoritesResponse,
  likesResponse,
  worksResponse,
} from '@/api/__generated__/story/profile/profile';
import { appAxiosInstance } from '@/api/appRequest';

type ProfileListSegment =
  | 'dramas'
  | 'works'
  | 'likes'
  | 'favorites'
  | 'actor-collections';

type ProfileActorCollectionsParams = Pick<
  ListActorCollectionsParams,
  'mark' | 'pageSize'
>;

type ProfileListParams =
  | DramasParams
  | WorksParams
  | LikesParams
  | FavoritesParams
  | ProfileActorCollectionsParams;

function appendProfileListQuery(params?: ProfileListParams): string {
  const normalizedParams = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined) {
      normalizedParams.append(key, value === null ? 'null' : value.toString());
    }
  });

  const stringifiedParams = normalizedParams.toString();
  return stringifiedParams.length > 0 ? `?${stringifiedParams}` : '';
}

function getProfileUserListUrl(
  userId: string,
  segment: ProfileListSegment,
  params?: ProfileListParams,
): string {
  return `/api/mini-drama/user/profiles/${userId}/${segment}${appendProfileListQuery(params)}`;
}

export function getProfileDramasQueryKey(
  userId: string,
  params?: DramasParams,
) {
  return [
    `/api/mini-drama/user/profiles/${userId}/dramas`,
    ...(params ? [params] : []),
  ] as const;
}

export function getProfileWorksQueryKey(userId: string, params?: WorksParams) {
  return [
    `/api/mini-drama/user/profiles/${userId}/works`,
    ...(params ? [params] : []),
  ] as const;
}

export function getProfileLikesQueryKey(userId: string, params?: LikesParams) {
  return [
    `/api/mini-drama/user/profiles/${userId}/likes`,
    ...(params ? [params] : []),
  ] as const;
}

export function getProfileFavoriteDramasQueryKey(
  userId: string,
  params?: FavoritesParams,
) {
  return [
    `/api/mini-drama/user/profiles/${userId}/favorites`,
    ...(params ? [params] : []),
  ] as const;
}

export function fetchProfileDramas(
  userId: string,
  params?: DramasParams,
  options?: RequestInit,
): Promise<dramasResponse> {
  return appAxiosInstance<dramasResponse>(
    getProfileUserListUrl(userId, 'dramas', params),
    {
      ...options,
      method: 'GET',
    },
  );
}

export function fetchProfileWorks(
  userId: string,
  params?: WorksParams,
  options?: RequestInit,
): Promise<worksResponse> {
  return appAxiosInstance<worksResponse>(
    getProfileUserListUrl(userId, 'works', params),
    {
      ...options,
      method: 'GET',
    },
  );
}

export function fetchProfileLikes(
  userId: string,
  params?: LikesParams,
  options?: RequestInit,
): Promise<likesResponse> {
  return appAxiosInstance<likesResponse>(
    getProfileUserListUrl(userId, 'likes', params),
    {
      ...options,
      method: 'GET',
    },
  );
}

export function fetchProfileFavoriteDramas(
  userId: string,
  params: FavoritesParams,
  options?: RequestInit,
): Promise<favoritesResponse> {
  return appAxiosInstance<favoritesResponse>(
    getProfileUserListUrl(userId, 'favorites', params),
    {
      ...options,
      method: 'GET',
    },
  );
}

export function getProfileActorCollectionsQueryKey(
  userId: string,
  params?: ProfileActorCollectionsParams,
) {
  return [
    `/api/mini-drama/user/profiles/${userId}/actor-collections`,
    ...(params ? [params] : []),
  ] as const;
}

export function fetchProfileActorCollections(
  userId: string,
  params?: ProfileActorCollectionsParams,
  options?: RequestInit,
): Promise<listActorCollectionsResponse> {
  return appAxiosInstance<listActorCollectionsResponse>(
    getProfileUserListUrl(userId, 'actor-collections', params),
    {
      ...options,
      method: 'GET',
    },
  );
}
