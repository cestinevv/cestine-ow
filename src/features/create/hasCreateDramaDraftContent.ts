import type {
  DramaFlowDocument,
  DramaFlowEpisode,
  DramaFlowRole,
} from '@/features/drama-flow/types/dramaFlowDocument';

function hasNonEmptyString(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

function episodeHasContent(episode: DramaFlowEpisode): boolean {
  return (
    hasNonEmptyString(episode.videoObjectKey) ||
    hasNonEmptyString(episode.title) ||
    hasNonEmptyString(episode.description) ||
    hasNonEmptyString(episode.localFileName)
  );
}

function roleHasContent(role: DramaFlowRole): boolean {
  return role.actorCollectionId != null;
}

/** 判断 persist 草稿是否含可回显的业务数据（排除仅默认空壳一集）。 */
export function hasCreateDramaDraftContent(doc: DramaFlowDocument): boolean {
  if (hasNonEmptyString(doc.title)) {
    return true;
  }

  if (hasNonEmptyString(doc.description)) {
    return true;
  }

  if (hasNonEmptyString(doc.coverObjectKey)) {
    return true;
  }

  if (hasNonEmptyString(doc.bannerObjectKey)) {
    return true;
  }

  if ((doc.tagIds?.length ?? 0) > 0) {
    return true;
  }

  if (doc.roles?.some(roleHasContent)) {
    return true;
  }

  if (doc.episodes?.some(episodeHasContent)) {
    return true;
  }

  return false;
}
