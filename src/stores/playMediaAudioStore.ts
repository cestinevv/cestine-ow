import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type PlayMediaAudioState = {
  /** 观影音量 0~1（不含剧场 Banner） */
  volume: number;
  /** 是否静音 */
  muted: boolean;
  setVolume: (volume: number) => void;
  setMuted: (muted: boolean) => void;
  toggleMuted: () => void;
};

function clampVolume(volume: number) {
  if (!Number.isFinite(volume)) {
    return 1;
  }

  return Math.min(1, Math.max(0, volume));
}

/**
 * 主播放器（详情 / H5 观影）全站音量偏好。
 * 剧场 Banner 单独本地管理，不读写本 store。
 */
export const usePlayMediaAudioStore = create<PlayMediaAudioState>()(
  persist(
    (set) => ({
      volume: 1,
      muted: false,
      setVolume: (volume) => {
        const nextVolume = clampVolume(volume);

        // 音量拖到 0 视为静音；>0 时只更新音量，静音态由 setMuted / 播放器回写决定
        if (nextVolume === 0) {
          set({ volume: 0, muted: true });
          return;
        }

        set({ volume: nextVolume });
      },
      setMuted: (muted) => {
        set({ muted });
      },
      toggleMuted: () => {
        set((state) => ({ muted: !state.muted }));
      },
    }),
    {
      name: 'play-media-audio',
      partialize: (state) => ({
        volume: state.volume,
        muted: state.muted,
      }),
    },
  ),
);
