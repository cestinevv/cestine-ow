import type { DramaEditSessionResponse as DramaEditContextResponse } from '@/api/__generated__/story/model/dramaEditSessionResponse';
import type { DramaFlowDocument } from '@/features/drama-flow/types/dramaFlowDocument';
import { parseNonNegativeNumber, parsePositiveNumber } from '@/utils';
import { readSnowflakeId } from '@/utils/snowflakeId';

export function mapEditContextToDramaFlowDocument(
  context: DramaEditContextResponse,
): DramaFlowDocument {
  const sortedEpisodes = [...(context.episodes ?? [])].sort(
    (a, b) => (a.episodeNo ?? 0) - (b.episodeNo ?? 0),
  );

  return {
    uploadSessionId: context.uploadSessionId,
    title: context.title,
    description: context.description,
    originalCoverUrl: context.coverUrl,
    tagIds: context.tagIds?.map((id) => String(id)),
    id: context.dramaId,
    onlineAt: parseNonNegativeNumber(context.onlineAt),

    episodes: sortedEpisodes.map((ep) => ({
      clientId: crypto.randomUUID(),
      episodeNo: ep.episodeNo ?? 0,
      title: ep.title,
      description: ep.description,
      id: ep.id,
      originalVideoUrl: ep.videoUrl,
      localFileSizeBytes: parsePositiveNumber(ep.videoSizeBytes),
      localVideoDurationSeconds: parseNonNegativeNumber(ep.durationSec),
      localVideoWidth: parsePositiveNumber(ep.width),
      localVideoHeight: parsePositiveNumber(ep.height),
    })),

    roles: (context.actorCollections ?? []).map((collection) => ({
      clientId: crypto.randomUUID(),
      name: collection.name,
      originalAvatarUrl: collection.avatarUrl,
      actorCollectionId: readSnowflakeId(collection.actorCollectionId),
    })),
  };
}
