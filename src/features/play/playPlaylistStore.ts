import { create } from 'zustand';

import type {
  PlayImmersiveItem,
  PlayPlaylistSource,
} from '@/features/play/types/playImmersive';
import { readSnowflakeId } from '@/utils/snowflakeId';

type PlayPlaylistState = {
  source?: PlayPlaylistSource;
  items: PlayImmersiveItem[];
  hasMore: boolean;
  isLoadingMore: boolean;
  setPlaylist: (
    source: PlayPlaylistSource,
    items: PlayImmersiveItem[],
    options?: {
      hasMore?: boolean;
      loadMore?: () => Promise<{
        items: PlayImmersiveItem[];
        hasMore: boolean;
      }>;
    },
  ) => void;
  loadMorePlaylist: () => Promise<void>;
  patchCreatorFollowedByMe: (
    creatorUserId: string | number | undefined,
    followedByMe: boolean,
  ) => void;
  clearPlaylist: () => void;
  loadMore?: () => Promise<{
    items: PlayImmersiveItem[];
    hasMore: boolean;
  }>;
};

/**
 * 搜索 / 个人作品 / 创作管理点进播放页时，把「当前结果列表」交给沉浸播放器做上下翻作品。
 * 剧场点进单部剧会清空本 store，二级页改为翻本剧上下集。
 * 推荐页自管 feed，不写本 store。
 */
export const usePlayPlaylistStore = create<PlayPlaylistState>((set, get) => ({
  source: undefined,
  items: [],
  hasMore: false,
  isLoadingMore: false,
  loadMore: undefined,
  setPlaylist: (source, items, options) => {
    set({
      source,
      items,
      hasMore: options?.hasMore ?? false,
      isLoadingMore: false,
      loadMore: options?.loadMore,
    });
  },
  loadMorePlaylist: async () => {
    const { hasMore, isLoadingMore, loadMore } = get();
    if (!hasMore || isLoadingMore || !loadMore) {
      return;
    }

    set({ isLoadingMore: true });
    try {
      const next = await loadMore();
      if (get().loadMore !== loadMore) {
        return;
      }

      set({ items: next.items, hasMore: next.hasMore });
    } catch {
      return;
    } finally {
      if (get().loadMore === loadMore) {
        set({ isLoadingMore: false });
      }
    }
  },
  patchCreatorFollowedByMe: (creatorUserId, followedByMe) => {
    const targetUserId = readSnowflakeId(creatorUserId);
    if (!targetUserId) {
      return;
    }

    set((state) => {
      let changed = false;
      const items = state.items.map((item) => {
        if (readSnowflakeId(item.feed?.userId) !== targetUserId) {
          return item;
        }

        changed = true;
        return {
          ...item,
          feed: {
            ...item.feed,
            followedByMe,
          },
        };
      });

      return changed ? { items } : {};
    });
  },
  clearPlaylist: () => {
    set({
      source: undefined,
      items: [],
      hasMore: false,
      isLoadingMore: false,
      loadMore: undefined,
    });
  },
}));
