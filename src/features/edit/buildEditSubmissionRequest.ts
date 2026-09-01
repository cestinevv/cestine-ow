import type { ActorCollectionChanges } from '@/api/__generated__/story/model/actorCollectionChanges';
import type { DramaEditEpisodeItem } from '@/api/__generated__/story/model/dramaEditEpisodeItem';
import type { UpdateDramaRequest as SubmitDramaEditRequest } from '@/api/__generated__/story/model/updateDramaRequest';
import type {
  DramaFlowDocument,
  DramaFlowEpisode,
  DramaFlowRole,
} from '@/features/drama-flow/types/dramaFlowDocument';
import { resolveEpisodeVideoDimensions } from '@/features/drama-flow/utils/dramaFlowEpisodeUtils';
import { renumberEpisodesForEdit } from '@/features/edit/renumberEpisodesForEdit';
import { readSnowflakeId } from '@/utils/snowflakeId';

function trimObjectKey(key: string | undefined): string | undefined {
  if (key === undefined) {
    return undefined;
  }

  const trimmed = key.trim();

  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeTagIdsForRequest(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.map((x) => String(x).trim()).filter((s) => s.length > 0);
}

function sortedTagKey(tagIds: string[] | undefined): string {
  if (!tagIds || tagIds.length === 0) {
    return '';
  }

  return [...tagIds].sort().join(',');
}

function isOptionalStringChanged(
  current: string | undefined,
  baseline: string | undefined,
): boolean {
  return (current?.trim() ?? '') !== (baseline?.trim() ?? '');
}

function hasMultimediaChange(
  current: DramaFlowDocument,
  baseline: DramaFlowDocument,
): boolean {
  const currentCover = trimObjectKey(current.coverObjectKey);
  const baselineCover = trimObjectKey(baseline.coverObjectKey);
  if (currentCover && currentCover !== baselineCover) {
    return true;
  }

  for (const episode of current.episodes ?? []) {
    const currentKey = trimObjectKey(episode.videoObjectKey);
    if (!currentKey) {
      continue;
    }

    const baselineEpisode = (baseline.episodes ?? []).find(
      (row) => row.clientId === episode.clientId || row.id === episode.id,
    );
    const baselineKey = trimObjectKey(baselineEpisode?.videoObjectKey);
    if (currentKey !== baselineKey) {
      return true;
    }
  }

  return false;
}

function resolveEpisodeDurationSec(
  episode: DramaFlowEpisode,
): number | undefined {
  const duration = episode.localVideoDurationSeconds;
  if (duration === undefined || duration === null) {
    return undefined;
  }

  return duration;
}

function buildEpisodeDiffItem(
  current: DramaFlowEpisode,
  baseline: DramaFlowEpisode | undefined,
): DramaEditEpisodeItem | null {
  const isNewEpisode = current.id === undefined || current.id === null;

  if (isNewEpisode) {
    const videoObjectKey = trimObjectKey(current.videoObjectKey);
    if (!videoObjectKey) {
      return null;
    }

    const dims = resolveEpisodeVideoDimensions(current);

    return {
      episodeNo: current.episodeNo,
      title: current.title,
      description: current.description,
      videoObjectKey,
      durationSec: resolveEpisodeDurationSec(current) ?? 0,
      width: dims?.width,
      height: dims?.height,
    };
  }

  if (!baseline) {
    return null;
  }

  const item: DramaEditEpisodeItem = { id: current.id };
  let hasChange = false;

  if (isOptionalStringChanged(current.title, baseline.title)) {
    item.title = current.title;
    hasChange = true;
  }

  if (isOptionalStringChanged(current.description, baseline.description)) {
    item.description = current.description;
    hasChange = true;
  }

  const currentVideoKey = trimObjectKey(current.videoObjectKey);
  const baselineVideoKey = trimObjectKey(baseline.videoObjectKey);
  if (currentVideoKey && currentVideoKey !== baselineVideoKey) {
    const dims = resolveEpisodeVideoDimensions(current);

    item.videoObjectKey = currentVideoKey;
    item.durationSec = resolveEpisodeDurationSec(current) ?? 0;
    item.width = dims?.width;
    item.height = dims?.height;
    hasChange = true;
  }

  return hasChange ? item : null;
}

function collectActorCollectionIds(roles: DramaFlowRole[]): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();

  for (const role of roles) {
    const idText = readSnowflakeId(role.actorCollectionId);
    if (!idText || seen.has(idText)) {
      continue;
    }

    seen.add(idText);
    ids.push(idText);
  }

  return ids;
}

function buildActorCollectionChanges(
  currentRoles: DramaFlowRole[],
  baselineRoles: DramaFlowRole[],
): ActorCollectionChanges | null {
  const currentIds = collectActorCollectionIds(currentRoles);
  const baselineIds = collectActorCollectionIds(baselineRoles);
  const baselineSet = new Set(baselineIds);
  const currentSet = new Set(currentIds);

  const add = currentIds.filter((id) => !baselineSet.has(id));
  const deleteIds = baselineIds.filter((id) => !currentSet.has(id));

  if (add.length === 0 && deleteIds.length === 0) {
    return null;
  }

  const changes: ActorCollectionChanges = {};
  if (add.length > 0) {
    changes.add = add as unknown as ActorCollectionChanges['add'];
  }
  if (deleteIds.length > 0) {
    changes.delete = deleteIds as unknown as ActorCollectionChanges['delete'];
  }

  return changes;
}

function findBaselineEpisode(
  baselineEpisodes: DramaFlowEpisode[],
  current: DramaFlowEpisode,
): DramaFlowEpisode | undefined {
  if (current.id !== undefined && current.id !== null) {
    return baselineEpisodes.find((row) => row.id === current.id);
  }

  return baselineEpisodes.find((row) => row.clientId === current.clientId);
}

function hasNonEmptyActorCollectionChanges(
  changes: ActorCollectionChanges | undefined,
): boolean {
  if (!changes) {
    return false;
  }

  return (changes.add?.length ?? 0) > 0 || (changes.delete?.length ?? 0) > 0;
}

function hasNonEmptyRequestBody(body: SubmitDramaEditRequest): boolean {
  if (Object.keys(body).length === 0) {
    return false;
  }

  if (
    body.actorCollectionChanges !== undefined &&
    !hasNonEmptyActorCollectionChanges(body.actorCollectionChanges)
  ) {
    const { actorCollectionChanges: _changes, ...rest } = body;

    return Object.keys(rest).length > 0;
  }

  return true;
}

export function buildEditSubmissionRequest(
  currentDocument: DramaFlowDocument,
  baselineDocument: DramaFlowDocument,
): SubmitDramaEditRequest {
  const request: Partial<SubmitDramaEditRequest> = {};

  if (
    isOptionalStringChanged(
      currentDocument.description,
      baselineDocument.description,
    )
  ) {
    request.description = currentDocument.description?.trim();
  }

  const currentCover = trimObjectKey(currentDocument.coverObjectKey);
  const baselineCover = trimObjectKey(baselineDocument.coverObjectKey);
  if (currentCover && currentCover !== baselineCover) {
    request.coverObjectKey = currentCover;
  }

  const currentTagKey = sortedTagKey(currentDocument.tagIds);
  const baselineTagKey = sortedTagKey(baselineDocument.tagIds);
  if (currentTagKey !== baselineTagKey) {
    const tagIds = normalizeTagIdsForRequest(currentDocument.tagIds);
    request.tagIds = tagIds as unknown as SubmitDramaEditRequest['tagIds'];
  }

  const numberedCurrentEpisodes = renumberEpisodesForEdit(
    currentDocument.episodes ?? [],
  );

  const baselineEpisodes = baselineDocument.episodes ?? [];
  const episodeDiffItems = numberedCurrentEpisodes
    .map((episode) =>
      buildEpisodeDiffItem(
        episode,
        findBaselineEpisode(baselineEpisodes, episode),
      ),
    )
    .filter((item): item is DramaEditEpisodeItem => item !== null);

  if (episodeDiffItems.length > 0) {
    request.episodes = episodeDiffItems;
  }

  const actorCollectionChanges = buildActorCollectionChanges(
    currentDocument.roles ?? [],
    baselineDocument.roles ?? [],
  );
  if (actorCollectionChanges) {
    request.actorCollectionChanges = actorCollectionChanges;
  }

  if (hasMultimediaChange(currentDocument, baselineDocument)) {
    if (currentDocument.uploadSessionId !== undefined) {
      request.uploadSessionId = currentDocument.uploadSessionId;
    }
  }

  return request as SubmitDramaEditRequest;
}

export function hasEditSubmissionChanges(
  currentDocument: DramaFlowDocument,
  baselineDocument: DramaFlowDocument,
): boolean {
  const body = buildEditSubmissionRequest(currentDocument, baselineDocument);

  return hasNonEmptyRequestBody(body);
}
