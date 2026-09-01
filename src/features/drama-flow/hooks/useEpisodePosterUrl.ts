import { useMemo } from 'react';

import type { DramaFlowEpisode } from '@/features/drama-flow/types/dramaFlowDocument';

export type EpisodePosterDisplay = {
  /** 同会话视频首帧 blob，仅当前标签页有效 */
  posterUrl: string | undefined;
  /** 刷新草稿或编辑态已有视频、无首帧 blob 时展示历史占位 */
  showHistoricalPlaceholder: boolean;
};

/**
 * 剧集行缩略图显示策略：
 * - 同会话首次上传：本地视频首帧 blob（`<img>`）
 * - 刷新草稿且已有 videoObjectKey，或编辑态接口已有剧集：历史视频占位（灰色底 + 视频图标 + Tooltip）
 */
export function useEpisodePosterUrl(
  episode: DramaFlowEpisode,
): EpisodePosterDisplay {
  return useMemo(() => {
    const sessionBlob = episode.localPosterObjectUrl?.trim();
    const hasSessionPoster = sessionBlob?.startsWith('blob:') ?? false;
    const hasUploadedVideo = Boolean(episode.videoObjectKey?.trim());
    const isPersistedEpisode = episode.id != null;

    return {
      posterUrl: hasSessionPoster ? sessionBlob : undefined,
      showHistoricalPlaceholder:
        !hasSessionPoster && (hasUploadedVideo || isPersistedEpisode),
    };
  }, [episode.id, episode.localPosterObjectUrl, episode.videoObjectKey]);
}
