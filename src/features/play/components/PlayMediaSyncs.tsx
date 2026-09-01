import { useMediaRemote, useMediaState } from '@vidstack/react';
import { useEffect, useRef } from 'react';

import { usePlayMediaAudioStore } from '@/stores/playMediaAudioStore';

/**
 * 切集加载新地址期间暂停上一集，避免（含全屏下）仍播放旧片源。
 * 须在 `MediaPlayer` 内使用，详情页与 H5 播放器共用。
 */
export function PlayMediaPauseOnEpisodeSwitch({
  isSwitchingEpisode,
}: {
  isSwitchingEpisode: boolean;
}) {
  const remote = useMediaRemote();
  const wasSwitchingRef = useRef(false);

  useEffect(() => {
    if (isSwitchingEpisode && !wasSwitchingRef.current) {
      remote.pause();
    }

    wasSwitchingRef.current = isSwitchingEpisode;
  }, [isSwitchingEpisode, remote]);

  return null;
}

/**
 * 将播放器内音量/静音变化回写到全站偏好（主要是音量滑条）。
 * store 变更优先：避免按钮改 store 后、播放器尚未跟上时被旧状态反写。
 */
export function PlayMediaAudioSync({
  suppressMutedWriteback = false,
}: {
  suppressMutedWriteback?: boolean;
}) {
  const muted = useMediaState('muted');
  const volume = useMediaState('volume');
  const canPlay = useMediaState('canPlay');
  const storeMuted = usePlayMediaAudioStore((state) => state.muted);
  const storeVolume = usePlayMediaAudioStore((state) => state.volume);
  const setMuted = usePlayMediaAudioStore((state) => state.setMuted);
  const setVolume = usePlayMediaAudioStore((state) => state.setVolume);
  const lastStoreMutedRef = useRef(storeMuted);
  const lastStoreVolumeRef = useRef(storeVolume);
  const readyToSyncRef = useRef(false);

  useEffect(() => {
    if (!canPlay) {
      readyToSyncRef.current = false;
      return;
    }

    if (!readyToSyncRef.current) {
      readyToSyncRef.current = true;
      lastStoreMutedRef.current = storeMuted;
      lastStoreVolumeRef.current = storeVolume;
      return;
    }

    // store 刚被按钮/快捷键改过：等播放器受控 props 跟上，禁止反写
    if (storeMuted !== lastStoreMutedRef.current) {
      lastStoreMutedRef.current = storeMuted;
      return;
    }

    if (storeVolume !== lastStoreVolumeRef.current) {
      lastStoreVolumeRef.current = storeVolume;
      return;
    }

    // 播放器侧变化（音量滑条等）→ 回写 store
    if (!suppressMutedWriteback && muted !== storeMuted) {
      setMuted(muted);
      lastStoreMutedRef.current = muted;
    }

    if (Math.abs(volume - storeVolume) >= 0.001) {
      setVolume(volume);
      lastStoreVolumeRef.current = volume;
    }
  }, [
    canPlay,
    muted,
    setMuted,
    setVolume,
    storeMuted,
    storeVolume,
    suppressMutedWriteback,
    volume,
  ]);

  return null;
}
