import { AppBusinessError } from '@/api/appRequest';
import { resolveInitialPlaySource } from '@/features/play/playSourceResolver';

/** 分集/短视频尚未完成转码，暂不可播放（GET .../episodes/{id}/detail） */
export const PLAY_EPISODE_NOT_TRANSCODED_CODE = 121018;

export const PLAY_SILENT_BUSINESS_CODES = [
  PLAY_EPISODE_NOT_TRANSCODED_CODE,
] as const;

export function isPlayEpisodeNotTranscodedError(
  error: unknown,
): error is AppBusinessError {
  return (
    error instanceof AppBusinessError &&
    error.code === PLAY_EPISODE_NOT_TRANSCODED_CODE
  );
}

export function hasPlayableEpisodeSource(args: {
  hlsUrl?: string;
  mp4Url?: string;
}): boolean {
  return Boolean(
    resolveInitialPlaySource({
      hlsUrl: args.hlsUrl,
      mp4Url: args.mp4Url,
    })?.url,
  );
}
