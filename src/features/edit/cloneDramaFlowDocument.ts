import type {
  DramaFlowDocument,
  DramaFlowEpisode,
  DramaFlowRole,
} from '@/features/drama-flow/types/dramaFlowDocument';

function cloneEpisode(episode: DramaFlowEpisode): DramaFlowEpisode {
  const { localPosterObjectUrl: _poster, ...rest } = episode;

  return { ...rest };
}

function cloneRole(role: DramaFlowRole): DramaFlowRole {
  return { ...role };
}

/** edit baseline 快照：排除仅当前会话有效的 UI 字段。 */
export function cloneDramaFlowDocument(
  document: DramaFlowDocument,
): DramaFlowDocument {
  return {
    ...document,
    tagIds: document.tagIds ? [...document.tagIds] : document.tagIds,
    episodes: document.episodes?.map(cloneEpisode),
    roles: document.roles?.map(cloneRole),
  };
}
