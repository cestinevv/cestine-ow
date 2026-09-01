/** 桌面沉浸播放「连播」开关；默认关闭，刷新后按上次选择恢复 */
const PLAY_CONTINUOUS_PLAY_STORAGE_KEY = 'play-continuous-play:v1';

const DEFAULT_CONTINUOUS_PLAY = false;

export function readStoredPlayContinuousPlay(): boolean {
  if (typeof window === 'undefined') {
    return DEFAULT_CONTINUOUS_PLAY;
  }

  try {
    const stored = window.localStorage.getItem(
      PLAY_CONTINUOUS_PLAY_STORAGE_KEY,
    );
    if (stored === '1') {
      return true;
    }
    if (stored === '0') {
      return false;
    }
  } catch {
    // localStorage 不可用时降级为默认关闭。
  }

  return DEFAULT_CONTINUOUS_PLAY;
}

export function storePlayContinuousPlay(enabled: boolean) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(
      PLAY_CONTINUOUS_PLAY_STORAGE_KEY,
      enabled ? '1' : '0',
    );
  } catch {
    // localStorage 不可用时忽略持久化。
  }
}
