import { zodResolver } from '@hookform/resolvers/zod';
import type { TFunction } from 'i18next';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Resolver } from 'react-hook-form';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { z } from 'zod';
import { Form } from '@/components/ui/form';
import { DramaFlowSecondBatchUploadZone } from '@/features/drama-flow/components/DramaFlowSecondBatchUploadZone';
import { DramaFlowSecondEpisodeDeleteConfirmDialog } from '@/features/drama-flow/components/DramaFlowSecondEpisodeDeleteConfirmDialog';
import { DramaFlowSecondEpisodeList } from '@/features/drama-flow/components/DramaFlowSecondEpisodeList';
import type { EpisodeDescriptionFormValues } from '@/features/drama-flow/components/DramaFlowSecondEpisodeRow';
import { DramaFlowSecondEpisodeVideoPreviewDialog } from '@/features/drama-flow/components/DramaFlowSecondEpisodeVideoPreviewDialog';
import { DramaFlowSecondFooter } from '@/features/drama-flow/components/DramaFlowSecondFooter';
import { DramaFlowSecondSectionCard } from '@/features/drama-flow/components/DramaFlowSecondSectionCard';
import { DramaFlowStepCard } from '@/features/drama-flow/components/DramaFlowStepCard';
import { DramaFlowSubmitReviewSuccessDialog } from '@/features/drama-flow/components/DramaFlowSubmitReviewSuccessDialog';
import { useDramaFlowConfig } from '@/features/drama-flow/contexts/DramaFlowConfigContext';
import {
  useDramaFlowStore,
  useDramaFlowStoreContext,
} from '@/features/drama-flow/hooks/useDramaFlowStore';
import { useDramaFlowSubmitReview } from '@/features/drama-flow/hooks/useDramaFlowSubmitReview';
import type { DramaFlowEpisode } from '@/features/drama-flow/types/dramaFlowDocument';
import {
  EPISODE_VIDEO_MAX_SIZE_LABEL,
  hasOverlongEpisodeVideoFileName,
  hasOversizedEpisodeVideo,
  MAX_EPISODE_VIDEO_COUNT,
  MAX_EPISODE_VIDEO_FILE_NAME_LENGTH,
  wouldExceedEpisodeVideoCount,
} from '@/features/drama-flow/utils/dramaFlowEpisodeUploadLimits';
import {
  createEpisodeDraftFromFile,
  fetchRemoteVideoSizeBytes,
  hasEpisodesMissingVideoDimensions,
  readRemoteVideoDimensions,
  readRemoteVideoDurationSeconds,
  readVideoFileMetadata,
  revokeEpisodePosterUrl,
  sortEpisodeClientIdsByUploadPriority,
  sortEpisodesByFileName,
  titleFromVideoFileName,
} from '@/features/drama-flow/utils/dramaFlowEpisodeUtils';
import {
  isObjectKeyMatchedUploadSession,
  uploadCreateDramaFile,
} from '@/features/drama-flow/utils/uploadDramaFlowFile';
import {
  isPersistedDramaFlowEpisode,
  renumberEpisodesForEdit,
} from '@/features/edit/renumberEpisodesForEdit';
import { SHOW_DEV_ONLY_UI } from '@/utils';

function renumberEpisodes(list: DramaFlowEpisode[]) {
  return list.map((ep, index) => ({
    ...ep,
    episodeNo: index + 1,
  }));
}

function applyEpisodeNumbering(
  list: DramaFlowEpisode[],
  isEditMode: boolean,
): DramaFlowEpisode[] {
  return isEditMode ? renumberEpisodesForEdit(list) : renumberEpisodes(list);
}

function finalizeEpisodeList(
  list: DramaFlowEpisode[],
  isEditMode: boolean,
): DramaFlowEpisode[] {
  return applyEpisodeNumbering(list, isEditMode);
}

/** 批量追加新文件时：保留已有顺序，仅对本次新增集按文件名排序后接在末尾 */
function appendNewEpisodesSortedByFileName(
  existing: DramaFlowEpisode[],
  newRows: DramaFlowEpisode[],
  isEditMode: boolean,
): DramaFlowEpisode[] {
  return finalizeEpisodeList(
    [...existing, ...sortEpisodesByFileName(newRows)],
    isEditMode,
  );
}

function episodeHasVideo(episode: DramaFlowEpisode): boolean {
  return (
    Boolean(episode.videoObjectKey?.trim()) ||
    Boolean(episode.localFileName?.trim()) ||
    Boolean(episode.originalVideoUrl?.trim())
  );
}

function isUploadAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (error instanceof Error && error.name === 'AbortError')
  );
}

function hasInvalidEpisodeObjectKey(
  episodes: DramaFlowEpisode[],
  uploadSessionId: number | undefined,
): boolean {
  return episodes.some((episode) => {
    const videoObjectKey = episode.videoObjectKey?.trim();
    if (!videoObjectKey) {
      return false;
    }

    return !isObjectKeyMatchedUploadSession(videoObjectKey, uploadSessionId);
  });
}

function stripEmptyEpisodeShells(
  episodes: DramaFlowEpisode[],
  isEditMode: boolean,
): DramaFlowEpisode[] {
  return episodes.filter(
    (ep) =>
      (isEditMode && isPersistedDramaFlowEpisode(ep)) ||
      Boolean(ep.videoObjectKey?.trim()) ||
      Boolean(ep.localFileName?.trim()),
  );
}

const EPISODE_DESCRIPTION_MAX_LENGTH = 1000;

function buildEpisodeStepSchema(t: TFunction, clientIds: readonly string[]) {
  const descriptionSchema = z
    .string()
    .trim()
    .min(1, { message: t('请输入分集描述') })
    .max(EPISODE_DESCRIPTION_MAX_LENGTH, {
      message: t('分集描述不超过1000字'),
    });

  return z.object({
    descriptions: z.object(
      Object.fromEntries(
        clientIds.map((clientId) => [clientId, descriptionSchema]),
      ),
    ),
  });
}

function applyEpisodeDescriptions(
  episodes: DramaFlowEpisode[],
  descriptions: Record<string, string>,
): DramaFlowEpisode[] {
  return episodes.map((episode) => ({
    ...episode,
    description: descriptions[episode.clientId] ?? episode.description,
  }));
}

/** 剧集视频上传管道最大并发（对齐浏览器同域连接上限，预留 1 路） */
const MAX_EPISODE_UPLOAD_CONCURRENCY = 5;

type EpisodeUploadStatus = 'uploading' | 'failed';

type CreateSecondIndexProps = {
  onGoToStep: (step: 1 | 2 | 3) => void;
};

export function DramaFlowEpisodeStep({ onGoToStep }: CreateSecondIndexProps) {
  const store = useDramaFlowStoreContext();
  const { mode } = useDramaFlowConfig();
  const isEditMode = mode === 'edit';
  const { t } = useTranslation();
  const document = useDramaFlowStore((s) => s.document);
  const hasHydrated = useDramaFlowStore((s) => s.hasHydrated);
  const patchDocument = useDramaFlowStore((s) => s.patchDocument);
  const replaceEpisodes = useDramaFlowStore((s) => s.replaceEpisodes);
  const {
    handleSubmitReview,
    submitSuccessOpen,
    setSubmitSuccessOpen,
    handleSubmitSuccessConfirm,
    submitPending,
  } = useDramaFlowSubmitReview();
  const [uploadProgressByClientId, setUploadProgressByClientId] = useState<
    Record<string, number>
  >({});
  const [uploadStatusByClientId, setUploadStatusByClientId] = useState<
    Record<string, EpisodeUploadStatus>
  >({});
  const episodeUploadAbortByClientIdRef = useRef<Map<string, AbortController>>(
    new Map(),
  );
  const isEpisodeVideoUploading = Object.values(
    uploadStatusByClientId,
  ).includes('uploading');
  const hasFailedEpisodeUpload = Object.values(uploadStatusByClientId).includes(
    'failed',
  );
  const pendingFileByClientIdRef = useRef<Map<string, File>>(new Map());
  const pendingUploadClientIdsRef = useRef<string[]>([]);
  const reuploadPriorityClientIdsRef = useRef<Set<string>>(new Set());
  const activeEpisodeUploadCountRef = useRef(0);
  const refreshInputRef = useRef<HTMLInputElement>(null);
  const refreshTargetClientIdRef = useRef<string | null>(null);
  const hasNormalizedEpisodesRef = useRef(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [previewEpisodeId, setPreviewEpisodeId] = useState<string | null>(null);
  const [previewVideoSrc, setPreviewVideoSrc] = useState<string | null>(null);
  const previewVideoSrcRef = useRef<string | null>(null);
  const probedPersistedEpisodeClientIdsRef = useRef<Set<string>>(new Set());

  const episodes = document.episodes;
  const episodeRows = useMemo(() => episodes ?? [], [episodes]);
  const episodeClientIdsKey = episodeRows
    .map((episode) => episode.clientId)
    .join('|');
  const episodeClientIds = useMemo(
    () =>
      episodeClientIdsKey.length > 0 ? episodeClientIdsKey.split('|') : [],
    [episodeClientIdsKey],
  );

  const validationSchema = useMemo(
    () => buildEpisodeStepSchema(t, episodeClientIds),
    [t, episodeClientIds],
  );
  const resolver = useMemo(
    () =>
      zodResolver(validationSchema) as Resolver<
        EpisodeDescriptionFormValues,
        unknown,
        EpisodeDescriptionFormValues
      >,
    [validationSchema],
  );
  const form = useForm<EpisodeDescriptionFormValues>({
    resolver,
    defaultValues: {
      descriptions: Object.fromEntries(
        episodeRows.map((episode) => [
          episode.clientId,
          episode.description ?? '',
        ]),
      ),
    },
    mode: 'onSubmit',
  });

  previewVideoSrcRef.current = previewVideoSrc;

  useEffect(() => {
    const current = form.getValues('descriptions') ?? {};
    const storedEpisodes = store.getState().document.episodes ?? [];
    const nextDescriptions: Record<string, string> = {};

    for (const clientId of episodeClientIds) {
      const storedEpisode = storedEpisodes.find(
        (episode) => episode.clientId === clientId,
      );
      nextDescriptions[clientId] =
        current[clientId] ?? storedEpisode?.description ?? '';
    }

    form.setValue('descriptions', nextDescriptions);
  }, [episodeClientIds, form, store]);

  useEffect(() => {
    return () => {
      for (const controller of episodeUploadAbortByClientIdRef.current.values()) {
        controller.abort();
      }
      episodeUploadAbortByClientIdRef.current.clear();
    };
  }, []);

  useEffect(() => {
    return () => {
      const src = previewVideoSrcRef.current;
      if (src?.startsWith('blob:')) {
        URL.revokeObjectURL(src);
      }
    };
  }, []);

  const nextDisabled =
    episodeRows.length === 0 ||
    !episodeRows.some((episode) => episodeHasVideo(episode));

  // 水合后：去掉无文件空壳行，第二步初始为 0 行列表。
  useLayoutEffect(() => {
    if (!hasHydrated || hasNormalizedEpisodesRef.current) {
      return;
    }

    hasNormalizedEpisodesRef.current = true;
    const stripped = stripEmptyEpisodeShells(episodeRows, isEditMode);
    if (stripped.length !== episodeRows.length) {
      replaceEpisodes(applyEpisodeNumbering(stripped, isEditMode));
    }
  }, [hasHydrated, episodeRows, replaceEpisodes, isEditMode]);

  // 编辑态：接口未返回体积/时长时，从 originalVideoUrl 补充探测，与本地上传展示口径一致。
  useEffect(() => {
    if (!isEditMode) {
      return;
    }

    const episodesToProbe = episodeRows.filter((episode) => {
      if (!isPersistedDramaFlowEpisode(episode)) {
        return false;
      }

      const videoUrl = episode.originalVideoUrl?.trim();
      if (!videoUrl) {
        return false;
      }

      if (probedPersistedEpisodeClientIdsRef.current.has(episode.clientId)) {
        return false;
      }

      const needsSize = !episode.localFileSizeBytes;
      const needsDuration =
        !episode.localVideoDurationSeconds ||
        episode.localVideoDurationSeconds <= 0;
      const needsDimensions =
        !episode.localVideoWidth ||
        !episode.localVideoHeight ||
        episode.localVideoWidth <= 0 ||
        episode.localVideoHeight <= 0;

      return needsSize || needsDuration || needsDimensions;
    });

    if (episodesToProbe.length === 0) {
      return;
    }

    let cancelled = false;

    void (async () => {
      for (const episode of episodesToProbe) {
        if (cancelled) {
          return;
        }

        probedPersistedEpisodeClientIdsRef.current.add(episode.clientId);

        const videoUrl = episode.originalVideoUrl?.trim();
        if (!videoUrl) {
          continue;
        }

        const needsSize = !episode.localFileSizeBytes;
        const needsDuration =
          !episode.localVideoDurationSeconds ||
          episode.localVideoDurationSeconds <= 0;
        const needsDimensions =
          !episode.localVideoWidth ||
          !episode.localVideoHeight ||
          episode.localVideoWidth <= 0 ||
          episode.localVideoHeight <= 0;

        const [durationSeconds, sizeBytes, dimensions] = await Promise.all([
          needsDuration
            ? readRemoteVideoDurationSeconds(videoUrl)
            : Promise.resolve(undefined),
          needsSize
            ? fetchRemoteVideoSizeBytes(videoUrl)
            : Promise.resolve(undefined),
          needsDimensions
            ? readRemoteVideoDimensions(videoUrl)
            : Promise.resolve(undefined),
        ]);

        if (cancelled) {
          return;
        }

        if (!durationSeconds && !sizeBytes && !dimensions) {
          continue;
        }

        const currentEpisodes = store.getState().document.episodes ?? [];
        const currentEpisode = currentEpisodes.find(
          (row) => row.clientId === episode.clientId,
        );
        if (!currentEpisode) {
          continue;
        }

        const patch: Partial<DramaFlowEpisode> = {};

        if (
          (!currentEpisode.localVideoDurationSeconds ||
            currentEpisode.localVideoDurationSeconds <= 0) &&
          durationSeconds
        ) {
          patch.localVideoDurationSeconds = durationSeconds;
        }

        if (!currentEpisode.localFileSizeBytes && sizeBytes) {
          patch.localFileSizeBytes = sizeBytes;
        }

        if (
          (!currentEpisode.localVideoWidth ||
            !currentEpisode.localVideoHeight ||
            currentEpisode.localVideoWidth <= 0 ||
            currentEpisode.localVideoHeight <= 0) &&
          dimensions
        ) {
          patch.localVideoWidth = dimensions.width;
          patch.localVideoHeight = dimensions.height;
        }

        if (Object.keys(patch).length === 0) {
          continue;
        }

        replaceEpisodes(
          finalizeEpisodeList(
            currentEpisodes.map((row) =>
              row.clientId === episode.clientId ? { ...row, ...patch } : row,
            ),
            isEditMode,
          ),
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [episodeRows, isEditMode, replaceEpisodes, store]);

  const commitEpisodes = (list: DramaFlowEpisode[]) => {
    replaceEpisodes(finalizeEpisodeList(list, isEditMode));
  };

  const showOversizedEpisodeVideoToast = () => {
    toast.error(
      t('所选视频中有文件超过 {{maxSize}}，请调整后重新上传', {
        maxSize: EPISODE_VIDEO_MAX_SIZE_LABEL,
      }),
    );
  };

  const showOverlongEpisodeVideoFileNameToast = () => {
    toast.error(
      t('所选视频中有文件名超过 {{maxLength}} 个字符，请调整后重新上传', {
        maxLength: MAX_EPISODE_VIDEO_FILE_NAME_LENGTH,
      }),
    );
  };

  const showTooManyEpisodeVideosToast = () => {
    toast.error(
      t('所有视频上传的数量超过了 {{maxCount}} 个，请调整后重新上传', {
        maxCount: MAX_EPISODE_VIDEO_COUNT,
      }),
    );
  };

  const handleSaveDraft = () => {
    if (hasInvalidEpisodeObjectKey(episodeRows, document.uploadSessionId)) {
      toast.error(t('剧集上传会话异常，请重新上传后再保存'));
      return;
    }

    commitEpisodes(
      applyEpisodeDescriptions(episodeRows, form.getValues('descriptions')),
    );
    toast.success(t('草稿已保存'));
  };

  const handlePrevStep = () => {
    if (isEpisodeVideoUploading) {
      return;
    }

    onGoToStep(1);
  };

  const handleNextValid = (data: EpisodeDescriptionFormValues) => {
    if (hasEpisodesMissingVideoDimensions(episodeRows)) {
      toast.error(t('剧集视频分辨率尚未读取完成，请稍候或重新上传后再下一步'));
      return;
    }

    commitEpisodes(applyEpisodeDescriptions(episodeRows, data.descriptions));

    if (SHOW_DEV_ONLY_UI) {
      onGoToStep(3);
      return;
    }

    handleSubmitReview();
  };

  const handleNextStep = () => {
    if (nextDisabled || isEpisodeVideoUploading || hasFailedEpisodeUpload) {
      return;
    }

    void form.handleSubmit(handleNextValid)();
  };

  const clearEpisodeUploadProgress = (clientId: string) => {
    setUploadProgressByClientId((prev) => {
      if (!(clientId in prev)) {
        return prev;
      }

      const next = { ...prev };
      delete next[clientId];
      return next;
    });
  };

  const clearEpisodeUploadStatus = (clientId: string) => {
    setUploadStatusByClientId((prev) => {
      if (!(clientId in prev)) {
        return prev;
      }

      const next = { ...prev };
      delete next[clientId];
      return next;
    });
  };

  const clearEpisodeUploadStatusAndProgress = (clientId: string) => {
    clearEpisodeUploadStatus(clientId);
    clearEpisodeUploadProgress(clientId);
  };

  const clearEpisodeUploadingController = (clientId: string) => {
    episodeUploadAbortByClientIdRef.current.delete(clientId);
  };

  const uploadEpisodeFile = async (file: File, targetClientId: string) => {
    episodeUploadAbortByClientIdRef.current.get(targetClientId)?.abort();

    const abortController = new AbortController();
    episodeUploadAbortByClientIdRef.current.set(
      targetClientId,
      abortController,
    );
    setUploadStatusByClientId((prev) => ({
      ...prev,
      [targetClientId]: 'uploading',
    }));
    setUploadProgressByClientId((prev) => ({ ...prev, [targetClientId]: 0 }));

    try {
      const sessionId = store.getState().document.uploadSessionId;
      if (!sessionId) {
        throw new Error('上传 Session 未初始化');
      }

      const { objectKey, uploadSessionId } = await uploadCreateDramaFile(
        file,
        'episode',
        sessionId,
        (percent) => {
          setUploadProgressByClientId((prev) => ({
            ...prev,
            [targetClientId]: percent,
          }));
        },
        abortController.signal,
      );

      if (abortController.signal.aborted) {
        return;
      }

      patchDocument({ uploadSessionId });

      reuploadPriorityClientIdsRef.current.delete(targetClientId);

      const currentList = store.getState().document.episodes ?? [];
      const nextList = currentList.map((e) =>
        e.clientId === targetClientId
          ? {
              ...e,
              videoObjectKey: objectKey,
              localFileName: file.name,
              localFileSizeBytes: file.size,
            }
          : e,
      );
      replaceEpisodes(finalizeEpisodeList(nextList, isEditMode));
      clearEpisodeUploadStatusAndProgress(targetClientId);
    } catch (error) {
      if (isUploadAbortError(error)) {
        clearEpisodeUploadStatusAndProgress(targetClientId);
        return;
      }

      setUploadStatusByClientId((prev) => ({
        ...prev,
        [targetClientId]: 'failed',
      }));
    } finally {
      if (
        episodeUploadAbortByClientIdRef.current.get(targetClientId) ===
        abortController
      ) {
        clearEpisodeUploadingController(targetClientId);
      }
    }
  };

  const resortPendingUploadQueue = () => {
    const episodes = store.getState().document.episodes ?? [];
    pendingUploadClientIdsRef.current = sortEpisodeClientIdsByUploadPriority(
      pendingUploadClientIdsRef.current,
      episodes,
      reuploadPriorityClientIdsRef.current,
    );
  };

  const dequeueNextUploadClientId = (): string | undefined => {
    while (pendingUploadClientIdsRef.current.length > 0) {
      const clientId = pendingUploadClientIdsRef.current.shift();
      if (!clientId) {
        continue;
      }

      const file = pendingFileByClientIdRef.current.get(clientId);
      if (!file) {
        continue;
      }

      const row = (store.getState().document.episodes ?? []).find(
        (episode) => episode.clientId === clientId,
      );
      if (row?.videoObjectKey?.trim()) {
        reuploadPriorityClientIdsRef.current.delete(clientId);
        continue;
      }

      return clientId;
    }

    return undefined;
  };

  const releaseEpisodeUploadSlot = () => {
    activeEpisodeUploadCountRef.current = Math.max(
      0,
      activeEpisodeUploadCountRef.current - 1,
    );
    pumpEpisodeUploadQueue();
  };

  const startEpisodeUploadWithSlot = (file: File, clientId: string) => {
    activeEpisodeUploadCountRef.current += 1;
    void uploadEpisodeFile(file, clientId).finally(() => {
      releaseEpisodeUploadSlot();
    });
  };

  const pumpEpisodeUploadQueue = () => {
    resortPendingUploadQueue();

    while (
      activeEpisodeUploadCountRef.current < MAX_EPISODE_UPLOAD_CONCURRENCY
    ) {
      const clientId = dequeueNextUploadClientId();
      if (!clientId) {
        return;
      }

      const file = pendingFileByClientIdRef.current.get(clientId);
      if (!file) {
        continue;
      }

      startEpisodeUploadWithSlot(file, clientId);
    }
  };

  const enqueueEpisodeUploads = (clientIds: string[]) => {
    for (const clientId of clientIds) {
      if (!pendingUploadClientIdsRef.current.includes(clientId)) {
        pendingUploadClientIdsRef.current.push(clientId);
      }
    }

    pumpEpisodeUploadQueue();
  };

  const removeClientIdFromUploadQueue = (clientId: string) => {
    pendingUploadClientIdsRef.current =
      pendingUploadClientIdsRef.current.filter((id) => id !== clientId);
    reuploadPriorityClientIdsRef.current.delete(clientId);
  };

  const handleBatchFilesAccepted = (files: File[]) => {
    if (files.length === 0) {
      return;
    }

    if (wouldExceedEpisodeVideoCount(episodeRows.length, files.length)) {
      showTooManyEpisodeVideosToast();
      return;
    }

    if (hasOversizedEpisodeVideo(files)) {
      showOversizedEpisodeVideoToast();
      return;
    }

    if (hasOverlongEpisodeVideoFileName(files)) {
      showOverlongEpisodeVideoFileNameToast();
      return;
    }

    const defaultEpisodeDescription = document.description?.trim() ?? '';
    const newRows = files.map((file) => ({
      ...createEpisodeDraftFromFile(file, ''),
      description: defaultEpisodeDescription,
    }));

    for (let index = 0; index < files.length; index += 1) {
      pendingFileByClientIdRef.current.set(
        newRows[index].clientId,
        files[index],
      );
    }

    const merged = appendNewEpisodesSortedByFileName(
      episodeRows,
      newRows,
      isEditMode,
    );
    replaceEpisodes(merged);

    const uploadClientIds = sortEpisodesByFileName(newRows).map(
      (row) => row.clientId,
    );
    enqueueEpisodeUploads(uploadClientIds);

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const clientId = newRows[index].clientId;

      void readVideoFileMetadata(file).then(
        ({ durationSeconds, videoWidth, videoHeight, posterObjectUrl }) => {
          const currentList = store.getState().document.episodes ?? [];
          const target = currentList.find(
            (episode) => episode.clientId === clientId,
          );
          if (!target) {
            revokeEpisodePosterUrl(posterObjectUrl);
            return;
          }

          if (target.localPosterObjectUrl) {
            revokeEpisodePosterUrl(target.localPosterObjectUrl);
          }

          const nextList = currentList.map((episode) =>
            episode.clientId === clientId
              ? {
                  ...episode,
                  localVideoDurationSeconds: durationSeconds,
                  localVideoWidth: videoWidth,
                  localVideoHeight: videoHeight,
                  localPosterObjectUrl: posterObjectUrl || undefined,
                }
              : episode,
          );
          replaceEpisodes(finalizeEpisodeList(nextList, isEditMode));
        },
      );
    }
  };

  const handleRefreshEpisode = (clientId: string) => {
    refreshTargetClientIdRef.current = clientId;
    refreshInputRef.current?.click();
  };

  const handleRefreshInputChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    const targetId = refreshTargetClientIdRef.current;
    event.target.value = '';

    if (!file || !targetId) {
      return;
    }

    if (hasOversizedEpisodeVideo([file])) {
      showOversizedEpisodeVideoToast();
      return;
    }

    if (hasOverlongEpisodeVideoFileName([file])) {
      showOverlongEpisodeVideoFileNameToast();
      return;
    }

    const { durationSeconds, videoWidth, videoHeight, posterObjectUrl } =
      await readVideoFileMetadata(file);
    const existing = episodeRows.find((e) => e.clientId === targetId);
    if (existing?.localPosterObjectUrl) {
      revokeEpisodePosterUrl(existing.localPosterObjectUrl);
    }

    pendingFileByClientIdRef.current.set(targetId, file);
    clearEpisodeUploadStatus(targetId);

    const nextList = episodeRows.map((e) =>
      e.clientId === targetId
        ? {
            ...e,
            title: titleFromVideoFileName(file.name),
            localFileName: file.name,
            localFileSizeBytes: file.size,
            localVideoDurationSeconds: durationSeconds,
            localVideoWidth: videoWidth,
            localVideoHeight: videoHeight,
            localPosterObjectUrl: posterObjectUrl,
            videoObjectKey: undefined,
          }
        : e,
    );
    replaceEpisodes(finalizeEpisodeList(nextList, isEditMode));

    // 若该行已在管道中上传，直接替换 in-flight 任务，不额外占用并发槽位；
    // 否则也直接触发上传，跳过队列出队时对 videoObjectKey 的旧值检查（React state 异步更新，
    // 出队时 store 可能仍读到旧的 key，导致上传被跳过）。
    reuploadPriorityClientIdsRef.current.add(targetId);
    void uploadEpisodeFile(file, targetId);
  };

  // 用户点击剧集行「删除」时打开二次确认弹层（Figma 4660:19343）。
  const handleRequestRemoveEpisode = (id: string) => {
    const episode = episodeRows.find((row) => row.clientId === id);
    if (isEditMode && episode && isPersistedDramaFlowEpisode(episode)) {
      return;
    }

    setDeleteConfirmId(id);
  };

  // 二次确认弹层开关变化：关闭时清空待删除的剧集 id。
  const handleDeleteConfirmOpenChange = (open: boolean) => {
    if (!open) {
      setDeleteConfirmId(null);
    }
  };

  // 用户在确认弹层点击「确定」后从草稿列表移除该剧集。
  const handleRemoveEpisodeConfirm = () => {
    if (deleteConfirmId === null) {
      return;
    }

    const id = deleteConfirmId;
    removeClientIdFromUploadQueue(id);

    if (uploadStatusByClientId[id] === 'uploading') {
      episodeUploadAbortByClientIdRef.current.get(id)?.abort();
    }

    clearEpisodeUploadStatusAndProgress(id);

    const removed = episodeRows.find((e) => e.clientId === id);
    if (removed?.localPosterObjectUrl) {
      revokeEpisodePosterUrl(removed.localPosterObjectUrl);
    }
    pendingFileByClientIdRef.current.delete(id);

    const filtered = episodeRows.filter((e) => e.clientId !== id);
    replaceEpisodes(applyEpisodeNumbering(filtered, isEditMode));
    setDeleteConfirmId(null);
  };

  const handleReorderEpisodes = (newEpisodes: DramaFlowEpisode[]) => {
    if (isEpisodeVideoUploading) {
      return;
    }

    // replaceEpisodes → createDramaStore.drafts 同步更新，persist 自动落盘
    replaceEpisodes(applyEpisodeNumbering(newEpisodes, isEditMode));
  };

  // 更新单集描述并同步写入草稿 store
  const handleEpisodeDescriptionChange = (clientId: string, value: string) => {
    replaceEpisodes(
      episodeRows.map((row) =>
        row.clientId === clientId ? { ...row, description: value } : row,
      ),
    );
  };

  const isEpisodeSortable = isEditMode
    ? (episode: DramaFlowEpisode) => !isPersistedDramaFlowEpisode(episode)
    : undefined;
  const isEpisodeRemovable = isEditMode
    ? (episode: DramaFlowEpisode) => !isPersistedDramaFlowEpisode(episode)
    : undefined;

  const deleteConfirmEpisode = deleteConfirmId
    ? episodeRows.find((episode) => episode.clientId === deleteConfirmId)
    : undefined;
  const deleteConfirmEpisodeTitle =
    deleteConfirmEpisode?.title?.trim() ||
    deleteConfirmEpisode?.localFileName?.trim() ||
    (deleteConfirmEpisode
      ? t('第{{n}}集', { n: deleteConfirmEpisode.episodeNo })
      : '');

  const previewEpisode = previewEpisodeId
    ? episodeRows.find((episode) => episode.clientId === previewEpisodeId)
    : undefined;
  const previewEpisodeTitle =
    previewEpisode?.localFileName?.trim() ||
    previewEpisode?.title?.trim() ||
    (previewEpisode ? t('第{{n}}集', { n: previewEpisode.episodeNo }) : '');

  const canPreviewEpisodeVideo = (clientId: string) => {
    return pendingFileByClientIdRef.current.has(clientId);
  };

  const handlePreviewEpisode = (clientId: string) => {
    const file = pendingFileByClientIdRef.current.get(clientId);

    if (!file) {
      return;
    }

    if (previewVideoSrc?.startsWith('blob:')) {
      URL.revokeObjectURL(previewVideoSrc);
    }

    setPreviewVideoSrc(URL.createObjectURL(file));
    setPreviewEpisodeId(clientId);
  };

  const handlePreviewOpenChange = (open: boolean) => {
    if (open) {
      return;
    }

    if (previewVideoSrc?.startsWith('blob:')) {
      URL.revokeObjectURL(previewVideoSrc);
    }

    setPreviewVideoSrc(null);
    setPreviewEpisodeId(null);
  };

  return (
    <Form {...form}>
      <DramaFlowStepCard currentStep={2}>
        <DramaFlowSecondSectionCard>
          <DramaFlowSecondBatchUploadZone
            disabled={false}
            onFilesAccepted={(files) => {
              handleBatchFilesAccepted(files);
            }}
          />
          <DramaFlowSecondEpisodeList
            episodes={episodeRows}
            uploadProgressByClientId={uploadProgressByClientId}
            uploadStatusByClientId={uploadStatusByClientId}
            episodeActionsLocked={isEpisodeVideoUploading}
            canPreviewVideo={canPreviewEpisodeVideo}
            isEpisodeSortable={isEpisodeSortable}
            isEpisodeRemovable={isEpisodeRemovable}
            onRefreshEpisode={handleRefreshEpisode}
            onRemove={handleRequestRemoveEpisode}
            onPreviewEpisode={handlePreviewEpisode}
            onReorder={handleReorderEpisodes}
            onDescriptionChange={handleEpisodeDescriptionChange}
            descriptionControl={form.control}
          />
        </DramaFlowSecondSectionCard>
        <DramaFlowSecondEpisodeDeleteConfirmDialog
          open={deleteConfirmId !== null}
          episodeTitle={deleteConfirmEpisodeTitle}
          onOpenChange={handleDeleteConfirmOpenChange}
          onConfirm={handleRemoveEpisodeConfirm}
        />
        <DramaFlowSecondEpisodeVideoPreviewDialog
          open={previewEpisodeId !== null}
          title={previewEpisodeTitle}
          videoSrc={previewVideoSrc}
          onOpenChange={handlePreviewOpenChange}
        />
        <input
          ref={refreshInputRef}
          type="file"
          accept="video/mp4,video/quicktime,video/x-msvideo,video/*"
          className="sr-only"
          onChange={(event) => {
            void handleRefreshInputChange(event);
          }}
        />
        <DramaFlowSecondFooter
          onSaveDraft={handleSaveDraft}
          onPrev={handlePrevStep}
          onNext={handleNextStep}
          nextDisabled={
            nextDisabled || isEpisodeVideoUploading || hasFailedEpisodeUpload
          }
          prevDisabled={isEpisodeVideoUploading}
          nextLabelKey={SHOW_DEV_ONLY_UI ? '下一步' : '发布'}
          nextPending={!SHOW_DEV_ONLY_UI && submitPending}
        />
      </DramaFlowStepCard>
      {!SHOW_DEV_ONLY_UI ? (
        <DramaFlowSubmitReviewSuccessDialog
          open={submitSuccessOpen}
          onOpenChange={setSubmitSuccessOpen}
          onConfirm={handleSubmitSuccessConfirm}
        />
      ) : null}
    </Form>
  );
}
