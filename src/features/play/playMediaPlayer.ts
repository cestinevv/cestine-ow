import { configurePlayHlsProvider } from '@/features/play/playHlsCredentials';

/**
 * 详情页与 H5 两个 vidstack `MediaPlayer` 的公共配置：
 * - 手动编排播放（`autoPlay={false}`），由各自的 PlaybackSync 控制
 * - 使用通用 HLS config（不含 startFragPrefetch，不影响详情页/H5）
 *
 * `keyTarget` / `keyShortcuts` / `className` / `onEnded` 等按播放器差异各自传入。
 */
export const PLAY_MEDIA_PLAYER_PROPS = {
  onProviderChange: configurePlayHlsProvider,
  autoPlay: false,
  playsInline: true,
  load: 'eager',
  streamType: 'on-demand',
  viewType: 'video',
} as const;
