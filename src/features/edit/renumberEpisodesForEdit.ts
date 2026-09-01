import type { DramaFlowEpisode } from '@/features/drama-flow/types/dramaFlowDocument';

function isPersistedEpisode(episode: DramaFlowEpisode): boolean {
  return episode.id !== undefined && episode.id !== null;
}

/** 编辑模式：已有集保持原 episodeNo，追加集从已有集数量 + 1 起连续编号。 */
export function renumberEpisodesForEdit(
  list: DramaFlowEpisode[],
): DramaFlowEpisode[] {
  const persistedCount = list.filter(isPersistedEpisode).length;
  let appendedIndex = 0;

  return list.map((episode) => {
    if (isPersistedEpisode(episode)) {
      return episode;
    }

    appendedIndex += 1;

    return {
      ...episode,
      episodeNo: persistedCount + appendedIndex,
    };
  });
}

export function isPersistedDramaFlowEpisode(
  episode: DramaFlowEpisode,
): boolean {
  return isPersistedEpisode(episode);
}
