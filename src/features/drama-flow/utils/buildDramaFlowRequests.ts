import type { BatchEpisodeItem } from '@/api/__generated__/story/model/batchEpisodeItem';
import type { CreateDramaRequest as BatchCreateDramaRequest } from '@/api/__generated__/story/model/createDramaRequest';
import type { UpdateDramaRequest as SubmitDramaEditRequest } from '@/api/__generated__/story/model/updateDramaRequest';
import type { DramaFlowDocument } from '@/features/drama-flow/types/dramaFlowDocument';
import { resolveEpisodeVideoDimensions } from '@/features/drama-flow/utils/dramaFlowEpisodeUtils';
import {
  buildEditSubmissionRequest,
  hasEditSubmissionChanges,
} from '@/features/edit/buildEditSubmissionRequest';
import { readSnowflakeId } from '@/utils/snowflakeId';

function trimObjectKey(key: string | undefined): string | undefined {
  if (key === undefined) {
    return undefined;
  }

  const t = key.trim();

  return t.length > 0 ? t : undefined;
}

function normalizeTagIdsForRequest(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.map((x) => String(x).trim()).filter((s) => s.length > 0);
}

function normalizeSnowflakeIdsForRequest(
  values: Array<string | number | undefined | null>,
): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const idText = readSnowflakeId(value);
    if (!idText || seen.has(idText)) {
      continue;
    }

    seen.add(idText);
    ids.push(idText);
  }

  return ids;
}

export function buildBatchCreateDramaRequest(
  document: DramaFlowDocument,
): BatchCreateDramaRequest {
  const uploadSessionId = readSnowflakeId(document.uploadSessionId);
  const title = document.title?.trim() ?? '';
  const description = document.description?.trim() ?? '';
  const coverObjectKey = trimObjectKey(document.coverObjectKey) ?? '';
  const tagIds = normalizeTagIdsForRequest(document.tagIds);

  const episodesWithVideo = (document.episodes ?? [])
    .map((row) => {
      const videoObjectKey = trimObjectKey(row.videoObjectKey);
      if (!videoObjectKey) {
        return null;
      }

      return { row, videoObjectKey };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const episodes: BatchEpisodeItem[] = episodesWithVideo.map((item, index) => {
    const dims = resolveEpisodeVideoDimensions(item.row);

    return {
      episodeNo: index + 1,
      title: item.row.title,
      description: item.row.description ?? '',
      videoObjectKey: item.videoObjectKey,
      durationSec: item.row.localVideoDurationSeconds ?? 0,
      width: dims?.width ?? 0,
      height: dims?.height ?? 0,
    };
  });

  const actorCollectionIds = normalizeSnowflakeIdsForRequest(
    (document.roles ?? []).map((row) => row.actorCollectionId),
  );

  return {
    uploadSessionId:
      uploadSessionId as unknown as BatchCreateDramaRequest['uploadSessionId'],
    title,
    description,
    coverObjectKey,
    episodes,
    ...(actorCollectionIds.length > 0
      ? {
          actorCollectionIds:
            actorCollectionIds as unknown as BatchCreateDramaRequest['actorCollectionIds'],
        }
      : {}),
    tagIds: tagIds as unknown as BatchCreateDramaRequest['tagIds'],
  };
}

export function buildSubmitDramaEditRequest(
  currentDocument: DramaFlowDocument,
  baselineDocument: DramaFlowDocument,
): SubmitDramaEditRequest {
  return buildEditSubmissionRequest(currentDocument, baselineDocument);
}

export { hasEditSubmissionChanges };
