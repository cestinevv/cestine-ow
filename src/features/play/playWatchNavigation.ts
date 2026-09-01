import { getIsMobileViewport } from '@/hooks/useMobileViewport';

export function resolvePlayEpisodeSelectionSearch<
  TSearch extends Record<string, unknown>,
>(search: TSearch, episode: number) {
  return {
    ...search,
    autoplay: undefined,
    commentId: undefined,
    episode,
    episodeId: undefined,
  };
}

export function resolvePlayDetailPath(dramaId: string): string {
  return `/play/${dramaId}`;
}

export function resolvePlayWatchPath(dramaId: string): string {
  return `/play/${dramaId}/watch`;
}

/** H5 进全屏 watch；桌面进短剧二级播放（沉浸壳，侧栏高亮短剧） */
export function resolvePlayEntryPath(dramaId: string): string {
  if (getIsMobileViewport()) {
    return resolvePlayWatchPath(dramaId);
  }

  return resolvePlayDetailPath(dramaId);
}

export type PlayWatchNavigateOptions = {
  episodeNo?: number;
  currentTime?: number;
};

type PlayWatchRouteNavigate = (options: {
  to: '/play/$dramaId/watch';
  params: { dramaId: string };
  search: { episode?: number };
}) => void | Promise<void>;

type PlayDetailRouteNavigate = (options: {
  to: '/play/$dramaId';
  params: { dramaId: string };
  search?: { autoplay: number };
}) => void | Promise<void>;

type PlayEntryNavigate = PlayWatchRouteNavigate & PlayDetailRouteNavigate;

/** 剧场入口：H5 进全屏 watch，桌面进短剧二级播放沉浸壳 */
export function navigateToPlayEntryPage(
  navigate: PlayEntryNavigate,
  dramaId: string,
  options?: { episodeNo?: number; autoplay?: boolean },
): void {
  if (getIsMobileViewport()) {
    navigateToPlayWatchPage(navigate, dramaId, options?.episodeNo);
    return;
  }

  void navigate({
    to: '/play/$dramaId',
    params: { dramaId },
    ...(options?.autoplay ? { search: { autoplay: 1 } } : {}),
  });
}

/** H5 沉浸播放页：写入 resume 并跳转 */
export function navigateToPlayWatchPage(
  navigate: PlayWatchRouteNavigate,
  dramaId: string,
  episodeNo?: number,
): void {
  void navigate({
    to: '/play/$dramaId/watch',
    params: { dramaId },
    search: { episode: episodeNo },
  });
}
