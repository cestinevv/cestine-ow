import { isHLSProvider, type MediaProviderAdapter } from '@vidstack/react';

/**
 * 重试参数说明：覆盖小米/OPPO/VIVO 等国产 Android 浏览器弱网或首次握手慢的场景。
 * hls.js 默认重试次数较少（manifest=1, frag=3），遇到轻微抖动即报错；
 * 此处适当增加重试次数与等待时间，减少黑屏卡住的概率。
 */
export const PLAY_HLS_CONFIG = {
  // manifest（m3u8 索引文件）加载重试
  manifestLoadingMaxRetry: 3,
  manifestLoadingRetryDelay: 1000,
  manifestLoadingMaxRetryTimeout: 8000,

  // level（码率层 m3u8）加载重试
  levelLoadingMaxRetry: 4,
  levelLoadingRetryDelay: 500,
  levelLoadingMaxRetryTimeout: 6000,

  // 分片（ts/m4s）加载重试
  fragLoadingMaxRetry: 4,
  fragLoadingRetryDelay: 500,
  fragLoadingMaxRetryTimeout: 5000,

  // 缓冲策略：30s 目标缓冲、10s 后向缓冲（减少低内存 Android 设备溢出）
  maxBufferLength: 30,
  backBufferLength: 10,
} as const;

/**
 * 播放器专用 HLS 配置（PlayWatchVideoPlayer / PlayImmersiveView）。
 * startFragPrefetch: manifest 解析完后立即预取首切片，加速启播。
 * Banner 等轻量场景继续用 PLAY_HLS_CONFIG，避免多拉流量。
 */
export const PLAY_WATCH_HLS_CONFIG = {
  ...PLAY_HLS_CONFIG,
  startFragPrefetch: true,
} as const;

export function configurePlayHlsProvider(
  provider: MediaProviderAdapter | null,
): void {
  if (!provider || !isHLSProvider(provider)) {
    return;
  }

  provider.config = {
    ...provider.config,
    ...PLAY_HLS_CONFIG,
  };
}

export function configurePlayWatchHlsProvider(
  provider: MediaProviderAdapter | null,
): void {
  if (!provider || !isHLSProvider(provider)) {
    return;
  }

  provider.config = {
    ...provider.config,
    ...PLAY_WATCH_HLS_CONFIG,
  };
}
