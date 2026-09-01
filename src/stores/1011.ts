import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { GetStoryResponse } from '@/api/__generated__/wallet/model/getStoryResponse';

const STORY_1011_STORAGE_KEY = 'story-1011';

type Story1011PersistedSnapshot = {
  state?: {
    story?: GetStoryResponse;
  };
  story?: GetStoryResponse;
};

type Story1011StoreState = {
  /**
   * persist 水合完成标记。
   * SSR 首屏与客户端首帧都必须为 false，避免先画出「-」占位。
   */
  hasHydrated: boolean;
  /** GET /api/activity/{activityId}/stories 业务体（本地持久化） */
  story: GetStoryResponse | null;
  setStory: (story: GetStoryResponse | null) => void;
};

/** 同步读取 localStorage 中的 1011 持久化快照（仅浏览器） */
export function readStory1011PersistedState(): {
  story: GetStoryResponse | null;
} {
  if (typeof window === 'undefined') {
    return { story: null };
  }

  try {
    const raw = window.localStorage.getItem(STORY_1011_STORAGE_KEY);

    if (!raw) {
      return { story: null };
    }

    const parsed = JSON.parse(raw) as Story1011PersistedSnapshot;
    // 兼容：业务字段可能在 `state` 下，也可能落在根级
    const stateObj = parsed.state ?? parsed;

    return {
      story: stateObj.story ?? null,
    };
  } catch {
    return { story: null };
  }
}

/**
 * 客户端挂载后、浏览器绘制前调用：把 localStorage 同步灌进 store。
 * 必须用 useLayoutEffect，否则刷新时会先闪一下「-」。
 */
export function hydrateStory1011StoreFromStorage() {
  if (typeof window === 'undefined') {
    return;
  }

  const persisted = readStory1011PersistedState();

  useStory1011Store.setState({
    ...persisted,
    hasHydrated: true,
  });

  void useStory1011Store.persist.rehydrate();
}

/**
 * 1011 活动页共享缓存。
 * 接口由 Story1011View 拉取后写入；展示层只订阅本 store。
 *
 * 初始值固定为空：保证 SSR HTML 与客户端首帧一致，不提前画「-」。
 */
export const useStory1011Store = create<Story1011StoreState>()(
  persist(
    (set) => ({
      hasHydrated: false,
      story: null,
      setStory: (story) => {
        set({ story });
      },
    }),
    {
      name: STORY_1011_STORAGE_KEY,
      // 由 hydrateStory1011StoreFromStorage 主动水合，避免异步 persist 抢在首屏后才写入
      skipHydration: true,
      partialize: (state) => ({
        story: state.story,
      }),
      onRehydrateStorage: () => (_state, error) => {
        if (error) {
          return;
        }

        useStory1011Store.setState({ hasHydrated: true });
      },
    },
  ),
);
