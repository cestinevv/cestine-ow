import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import {
  CloudUpload,
  ImageIcon,
  Loader2,
  Play,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { isExpired } from '@/api/__generated__/story/create-common/create-common';
import {
  getListMyShortVideosQueryKey,
  usePublishShortVideo,
} from '@/api/__generated__/story/create-shortvideo/create-shortvideo';
import type { ShortVideoEditSessionResponse } from '@/api/__generated__/story/model/shortVideoEditSessionResponse';
import type { UpdateShortVideoRequest } from '@/api/__generated__/story/model/updateShortVideoRequest';
import { AppDialog } from '@/components/common/AppDialog';
import AppLoadingContainer from '@/components/common/AppLoadingContainer';
import { ContentContainer } from '@/components/common/ContentContainer';
import { PageTitleSection } from '@/components/common/PageTitleSection';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { extractStoryInnerData } from '@/features/create-actor/uploadCreatorActorAvatar';
import {
  buildCreateShortVideoDraftKey,
  buildPublishShortVideoRequest,
  canPublishShortVideo,
  formatShortVideoDuration,
  getShortVideoCoverValidationError,
  getShortVideoUploadValidationError,
  hasShortVideoDraftContent,
  parseShortVideoDraft,
  pickShortVideoMediaDisplayUrls,
  SHORT_VIDEO_COVER_MAX_SIZE_LABEL,
  SHORT_VIDEO_DESCRIPTION_MAX_LENGTH,
  SHORT_VIDEO_MAX_SIZE_LABEL,
  SHORT_VIDEO_TITLE_MAX_LENGTH,
  type ShortVideoDraft,
  type ShortVideoUploadStatus,
} from '@/features/create-short-video/createShortVideo';
import {
  getCreatorShortVideoEditSession,
  getCreatorShortVideoEditSessionQueryKey,
  submitCreatorShortVideoUpdate,
} from '@/features/create-short-video/editShortVideoApi';
import {
  createShortVideoUploadSession,
  isShortVideoUploadAbortError,
  uploadShortVideoFile,
} from '@/features/create-short-video/uploadShortVideoFile';
import { CreationManagementTab } from '@/features/creation-management/creationManagementFormat';
import { DramaFlowDramaClearDraftConfirmDialog } from '@/features/drama-flow/components/DramaFlowDramaClearDraftConfirmDialog';
import { DramaFlowDramaDraftSyncToast } from '@/features/drama-flow/components/DramaFlowDramaDraftSyncToast';
import { DramaFlowSecondEpisodeVideoPreviewDialog } from '@/features/drama-flow/components/DramaFlowSecondEpisodeVideoPreviewDialog';
import {
  readVideoFileMetadata,
  revokeEpisodePosterUrl,
  titleFromVideoFileName,
} from '@/features/drama-flow/utils/dramaFlowEpisodeUtils';
import useGlobalStore from '@/stores/global';
import { buildMiniDramaPublicObjectUrl, cn, formatFileSizeMeta } from '@/utils';
import { readSnowflakeId } from '@/utils/snowflakeId';

const CREATE_SHORT_VIDEO_DRAFT_SYNC_TOAST_ID =
  'create-short-video-draft-sync-toast';

function revokeBlobUrl(url: string | undefined): void {
  if (url?.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}

async function fileFromObjectUrl(url: string, fileName: string): Promise<File> {
  const response = await fetch(url);
  const blob = await response.blob();

  return new File([blob], fileName, { type: blob.type || 'image/jpeg' });
}

function getFileExtension(fileName: string | undefined): string {
  const ext = fileName?.split('.').pop()?.trim();

  return ext ? ext.toUpperCase() : 'MP4';
}

function ShortVideoDeleteConfirmDialog({
  open,
  title,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  title: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  const { t } = useTranslation();

  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('确定删除 “{{title}}” 吗？', { title })}
      width={343}
      bodyScroll={false}
      hideHeader
      bodyClassName="px-4 pt-6 pb-4"
    >
      <div className="flex flex-col gap-6">
        <p className="text-center text-base leading-6 font-medium text-foreground">
          {t('确定删除 “{{title}}” 吗？', { title })}
        </p>
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            className="h-10 flex-1 rounded-xl px-6 py-2.5 text-sm leading-5 font-medium"
            onClick={() => onOpenChange(false)}
          >
            {t('取消')}
          </Button>
          <Button
            type="button"
            className="h-10 flex-1 rounded-xl bg-foreground px-6 py-2.5 text-sm leading-5 font-medium text-background hover:bg-foreground/90"
            onClick={handleConfirm}
          >
            {t('确定')}
          </Button>
        </div>
      </div>
    </AppDialog>
  );
}

export function CreateShortVideoView({
  editEpisodeId,
}: {
  editEpisodeId?: string;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const isLogin = useGlobalStore((state) => state.isLogin);
  const userId = useGlobalStore((state) => state.userProfile?.userId);
  const editEpisodeIdText = readSnowflakeId(editEpisodeId);
  const isEditMode = Boolean(editEpisodeIdText);

  const [uploadSessionId, setUploadSessionId] = useState<number>();
  const [videoObjectKey, setVideoObjectKey] = useState('');
  const [coverObjectKey, setCoverObjectKey] = useState('');
  const [videoPreviewUrl, setVideoPreviewUrl] = useState('');
  const [coverPreviewUrl, setCoverPreviewUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileSizeBytes, setFileSizeBytes] = useState<number>();
  const [durationSec, setDurationSec] = useState<number>();
  const [videoWidth, setVideoWidth] = useState<number>();
  const [videoHeight, setVideoHeight] = useState<number>();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [uploadStatus, setUploadStatus] =
    useState<ShortVideoUploadStatus>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isCoverUploading, setIsCoverUploading] = useState(false);
  const [hasManualCover, setHasManualCover] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [clearDraftDialogOpen, setClearDraftDialogOpen] = useState(false);

  const videoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const initializedRef = useRef(false);
  const editHydratedEpisodeIdRef = useRef<string | null>(null);
  const uploadRunIdRef = useRef(0);
  const videoAbortRef = useRef<AbortController | null>(null);
  const coverAbortRef = useRef<AbortController | null>(null);
  const hasManualCoverRef = useRef(false);
  const videoPreviewUrlRef = useRef('');
  const coverPreviewUrlRef = useRef('');
  const draftSnapshotRef = useRef<ShortVideoDraft>({
    title: '',
    description: '',
  });

  const publishMutation = usePublishShortVideo();
  const updateMutation = useMutation({
    mutationFn: (data: UpdateShortVideoRequest) => {
      if (!editEpisodeIdText) {
        throw new Error('Missing episodeId');
      }

      return submitCreatorShortVideoUpdate(editEpisodeIdText, data);
    },
  });
  const editSessionQuery = useQuery({
    queryKey: editEpisodeIdText
      ? getCreatorShortVideoEditSessionQueryKey(editEpisodeIdText)
      : ['short-video-edit-session-disabled'],
    queryFn: ({ signal }) => {
      if (!editEpisodeIdText) {
        throw new Error('Missing episodeId');
      }

      return getCreatorShortVideoEditSession(editEpisodeIdText, { signal });
    },
    enabled: isEditMode && Boolean(editEpisodeIdText),
    retry: false,
  });
  const draftKey = userId ? buildCreateShortVideoDraftKey(String(userId)) : '';
  const displayTitle = title.trim() || fileName || t('短视频');
  const canPublish = canPublishShortVideo({
    title,
    description,
    uploadSessionId,
    videoObjectKey,
    coverObjectKey,
    durationSec,
    width: videoWidth,
    height: videoHeight,
    uploadStatus,
    isPublishing: publishMutation.isPending || isCoverUploading,
  });
  const canUpdate = Boolean(
    editEpisodeIdText &&
      description.trim() &&
      (coverPreviewUrl || coverObjectKey) &&
      !isCoverUploading &&
      !updateMutation.isPending,
  );
  const { videoDisplayUrl, coverDisplayUrl } = pickShortVideoMediaDisplayUrls({
    videoPreviewUrl,
    coverPreviewUrl,
    videoPublicUrl: buildMiniDramaPublicObjectUrl(videoObjectKey),
    coverPublicUrl: buildMiniDramaPublicObjectUrl(coverObjectKey),
  });
  draftSnapshotRef.current = {
    uploadSessionId,
    videoObjectKey,
    coverObjectKey,
    title,
    description,
    fileName,
    fileSizeBytes,
    durationSec,
    width: videoWidth,
    height: videoHeight,
    hasManualCover: hasManualCoverRef.current,
  };

  useEffect(() => {
    return () => {
      revokeBlobUrl(videoPreviewUrlRef.current);
      revokeBlobUrl(coverPreviewUrlRef.current);
      videoAbortRef.current?.abort();
      coverAbortRef.current?.abort();
    };
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: 草稿水合只在登录用户首次进入页面时执行一次。
  useEffect(() => {
    if (isEditMode || !isLogin || !draftKey || initializedRef.current) {
      return;
    }

    initializedRef.current = true;
    const draft = parseShortVideoDraft(localStorage.getItem(draftKey));
    if (hasShortVideoDraftContent(draft)) {
      setUploadSessionId(draft?.uploadSessionId);
      setVideoObjectKey(draft?.videoObjectKey ?? '');
      setCoverObjectKey(draft?.coverObjectKey ?? '');
      setTitle(draft?.title ?? '');
      setDescription(draft?.description ?? '');
      setFileName(draft?.fileName ?? '');
      setFileSizeBytes(draft?.fileSizeBytes);
      setDurationSec(draft?.durationSec);
      setVideoWidth(draft?.width);
      setVideoHeight(draft?.height);
      setUploadStatus(draft?.videoObjectKey ? 'success' : 'idle');
      setHasManualCover(
        Boolean(draft?.hasManualCover || draft?.coverObjectKey),
      );
      hasManualCoverRef.current = Boolean(
        draft?.hasManualCover || draft?.coverObjectKey,
      );
      draftSnapshotRef.current = {
        uploadSessionId: draft?.uploadSessionId,
        videoObjectKey: draft?.videoObjectKey ?? '',
        coverObjectKey: draft?.coverObjectKey ?? '',
        title: draft?.title ?? '',
        description: draft?.description ?? '',
        fileName: draft?.fileName ?? '',
        fileSizeBytes: draft?.fileSizeBytes,
        durationSec: draft?.durationSec,
        width: draft?.width,
        height: draft?.height,
        hasManualCover: Boolean(draft?.hasManualCover || draft?.coverObjectKey),
      };

      // 用户点击 Toast「清除数据」：立即关闭 Toast 并打开清空确认弹窗。
      const handleOpenClearDraftDialog = () => {
        toast.dismiss(CREATE_SHORT_VIDEO_DRAFT_SYNC_TOAST_ID);
        setClearDraftDialogOpen(true);
      };

      toast.custom(
        () => (
          <DramaFlowDramaDraftSyncToast
            message={t('已同步草稿数据')}
            clearLabel={t('清除数据')}
            onClearClick={handleOpenClearDraftDialog}
          />
        ),
        {
          id: CREATE_SHORT_VIDEO_DRAFT_SYNC_TOAST_ID,
          duration: 5000,
          unstyled: true,
          className: 'border-transparent bg-transparent p-0 shadow-none',
        },
      );
    }

    void restoreDraftUploadSession(draft);
  }, [draftKey, isLogin, t]);

  useEffect(() => {
    if (
      !isEditMode ||
      !editEpisodeIdText ||
      editSessionQuery.data?.status !== 200
    ) {
      return;
    }

    if (editHydratedEpisodeIdRef.current === editEpisodeIdText) {
      return;
    }

    const session = extractStoryInnerData<ShortVideoEditSessionResponse>(
      editSessionQuery.data,
    );
    if (!session) {
      return;
    }

    editHydratedEpisodeIdRef.current = editEpisodeIdText;
    setUploadSessionId(session.uploadSessionId);
    setVideoObjectKey('');
    setCoverObjectKey('');
    setTitle(session.title ?? '');
    setDescription(
      (session.description ?? '').slice(0, SHORT_VIDEO_DESCRIPTION_MAX_LENGTH),
    );
    setFileName(session.title || t('短视频'));
    setFileSizeBytes(session.videoSizeBytes);
    setDurationSec(session.durationSec);
    setVideoWidth(session.width);
    setVideoHeight(session.height);
    setVideoPreviewUrl(session.videoUrl ?? '');
    setCoverPreviewUrl(session.coverUrl ?? '');
    videoPreviewUrlRef.current = session.videoUrl ?? '';
    coverPreviewUrlRef.current = session.coverUrl ?? '';
    setUploadStatus(session.videoUrl ? 'success' : 'idle');
  }, [editEpisodeIdText, editSessionQuery.data, isEditMode, t]);

  async function ensureUploadSession(currentSessionId?: number) {
    if (currentSessionId) {
      return currentSessionId;
    }

    if (uploadSessionId) {
      return uploadSessionId;
    }

    const nextSessionId = await createShortVideoUploadSession();
    setUploadSessionId(nextSessionId);

    return nextSessionId;
  }

  async function restoreDraftUploadSession(draft: ShortVideoDraft | null) {
    const sessionId = draft?.uploadSessionId;

    if (sessionId) {
      try {
        const expired = extractStoryInnerData<boolean>(
          await isExpired(sessionId),
        );

        if (!expired) {
          setUploadSessionId(sessionId);

          return sessionId;
        }
      } catch (error) {
        console.error('Failed to validate short video upload session:', error);
      }

      clearExpiredDraftMedia();
      persistDraft({
        uploadSessionId: undefined,
        videoObjectKey: '',
        coverObjectKey: '',
        fileName: '',
        fileSizeBytes: undefined,
        durationSec: undefined,
        width: undefined,
        height: undefined,
        hasManualCover: false,
      });
    }

    return ensureUploadSession();
  }

  function persistDraft(patch?: Partial<ShortVideoDraft>) {
    if (!draftKey) {
      return;
    }

    const draft: ShortVideoDraft = {
      ...draftSnapshotRef.current,
      ...patch,
    };
    draftSnapshotRef.current = draft;
    localStorage.setItem(draftKey, JSON.stringify(draft));
  }

  function clearExpiredDraftMedia() {
    revokeBlobUrl(videoPreviewUrlRef.current);
    revokeBlobUrl(coverPreviewUrlRef.current);
    videoPreviewUrlRef.current = '';
    coverPreviewUrlRef.current = '';
    setVideoPreviewUrl('');
    setCoverPreviewUrl('');
    setVideoObjectKey('');
    setCoverObjectKey('');
    setFileName('');
    setFileSizeBytes(undefined);
    setDurationSec(undefined);
    setVideoWidth(undefined);
    setVideoHeight(undefined);
    setUploadStatus('idle');
    setUploadProgress(0);
    setIsCoverUploading(false);
    setHasManualCover(false);
    hasManualCoverRef.current = false;
  }

  function clearDraftAndForm() {
    if (draftKey) {
      localStorage.removeItem(draftKey);
    }

    uploadRunIdRef.current += 1;
    videoAbortRef.current?.abort();
    coverAbortRef.current?.abort();
    clearExpiredDraftMedia();
    setTitle('');
    setDescription('');
    draftSnapshotRef.current = {
      title: '',
      description: '',
    };
  }

  function handleConfirmClearDraft() {
    clearDraftAndForm();
    void ensureUploadSession();
  }

  function showVideoValidationToast(file: File): boolean {
    const validationError = getShortVideoUploadValidationError(file);
    if (!validationError) {
      return true;
    }

    toast.error(
      validationError === 'too-large'
        ? t('所选视频中有文件超过 {{maxSize}}，请调整后重新上传', {
            maxSize: SHORT_VIDEO_MAX_SIZE_LABEL,
          })
        : t('请选择支持的视频格式'),
    );

    return false;
  }

  function showCoverValidationToast(file: File): boolean {
    const validationError = getShortVideoCoverValidationError(file);
    if (!validationError) {
      return true;
    }

    toast.error(
      validationError === 'too-large'
        ? t('图片大小不能超过{{maxSize}}。', {
            maxSize: SHORT_VIDEO_COVER_MAX_SIZE_LABEL,
          })
        : t('仅支持 JPG/PNG 格式'),
    );

    return false;
  }

  async function uploadCoverFile(file: File, sessionId: number, runId: number) {
    coverAbortRef.current?.abort();
    const controller = new AbortController();
    coverAbortRef.current = controller;
    setIsCoverUploading(true);

    try {
      const result = await uploadShortVideoFile({
        file,
        fileCategory: 'cover',
        uploadSessionId: sessionId,
        signal: controller.signal,
      });

      if (uploadRunIdRef.current !== runId) {
        return;
      }

      setCoverObjectKey(result.objectKey);
      persistDraft({
        uploadSessionId: sessionId,
        coverObjectKey: result.objectKey,
        hasManualCover: hasManualCoverRef.current,
      });
    } catch (error) {
      if (isShortVideoUploadAbortError(error)) {
        return;
      }

      if (uploadRunIdRef.current === runId) {
        setCoverObjectKey('');
        toast.error(t('上传失败，请重试'));
      }
    } finally {
      if (uploadRunIdRef.current === runId) {
        setIsCoverUploading(false);
      }
    }
  }

  async function handleVideoFile(file: File) {
    if (!showVideoValidationToast(file)) {
      return;
    }

    const runId = uploadRunIdRef.current + 1;
    uploadRunIdRef.current = runId;
    videoAbortRef.current?.abort();
    coverAbortRef.current?.abort();
    const controller = new AbortController();
    videoAbortRef.current = controller;
    const nextVideoPreviewUrl = URL.createObjectURL(file);
    const nextTitle = titleFromVideoFileName(file.name).slice(
      0,
      SHORT_VIDEO_TITLE_MAX_LENGTH,
    );

    revokeBlobUrl(videoPreviewUrlRef.current);
    videoPreviewUrlRef.current = nextVideoPreviewUrl;
    setVideoPreviewUrl(nextVideoPreviewUrl);
    setFileName(file.name);
    setFileSizeBytes(file.size);
    setTitle(nextTitle);
    setVideoObjectKey('');
    setUploadStatus('uploading');
    setUploadProgress(0);

    try {
      const sessionId = await ensureUploadSession();
      const metadata = await readVideoFileMetadata(file);

      if (uploadRunIdRef.current !== runId) {
        revokeEpisodePosterUrl(metadata.posterObjectUrl);
        return;
      }

      setDurationSec(metadata.durationSeconds);
      setVideoWidth(metadata.videoWidth);
      setVideoHeight(metadata.videoHeight);

      if (metadata.posterObjectUrl && !hasManualCoverRef.current) {
        revokeBlobUrl(coverPreviewUrlRef.current);
        coverPreviewUrlRef.current = metadata.posterObjectUrl;
        setCoverPreviewUrl(metadata.posterObjectUrl);
        setCoverObjectKey('');
        const posterFile = await fileFromObjectUrl(
          metadata.posterObjectUrl,
          `${titleFromVideoFileName(file.name)}-cover.jpg`,
        );
        void uploadCoverFile(posterFile, sessionId, runId);
      }

      const result = await uploadShortVideoFile({
        file,
        fileCategory: 'episode',
        uploadSessionId: sessionId,
        signal: controller.signal,
        onUploadProgress: (progress) => {
          if (uploadRunIdRef.current === runId) {
            setUploadProgress(progress);
          }
        },
      });

      if (uploadRunIdRef.current !== runId) {
        return;
      }

      setVideoObjectKey(result.objectKey);
      setUploadProgress(100);
      setUploadStatus('success');
      persistDraft({
        uploadSessionId: sessionId,
        videoObjectKey: result.objectKey,
        fileName: file.name,
        fileSizeBytes: file.size,
        durationSec: metadata.durationSeconds,
        width: metadata.videoWidth,
        height: metadata.videoHeight,
        title: nextTitle,
      });
    } catch (error) {
      if (isShortVideoUploadAbortError(error)) {
        return;
      }

      if (uploadRunIdRef.current === runId) {
        setVideoObjectKey('');
        setUploadStatus('failed');
        toast.error(
          navigator.onLine ? t('上传失败，请重试') : t('网络异常，请检查连接'),
        );
      }
    }
  }

  function handleVideoInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (file) {
      void handleVideoFile(file);
    }
  }

  async function handleCoverFile(file: File) {
    if (!showCoverValidationToast(file)) {
      return;
    }

    try {
      const runId = uploadRunIdRef.current;
      const sessionId = await ensureUploadSession();
      const nextCoverPreviewUrl = URL.createObjectURL(file);

      revokeBlobUrl(coverPreviewUrlRef.current);
      coverPreviewUrlRef.current = nextCoverPreviewUrl;
      setCoverPreviewUrl(nextCoverPreviewUrl);
      setCoverObjectKey('');
      setHasManualCover(true);
      hasManualCoverRef.current = true;
      void uploadCoverFile(file, sessionId, runId);
    } catch {
      toast.error(
        navigator.onLine ? t('上传失败，请重试') : t('网络异常，请检查连接'),
      );
    }
  }

  function handleCoverInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (file) {
      void handleCoverFile(file);
    }
  }

  function handleDescriptionChange(
    event: React.ChangeEvent<HTMLTextAreaElement>,
  ) {
    const nextDescription = event.target.value;
    setDescription(nextDescription);

    if (!isEditMode && initializedRef.current) {
      persistDraft({ description: nextDescription });
    }
  }

  function handleSaveDraft() {
    if (isEditMode) {
      return;
    }

    if (!draftKey) {
      toast.error(t('保存失败，请重试'));
      return;
    }

    if (uploadStatus === 'uploading' || isCoverUploading) {
      return;
    }

    persistDraft();
    toast.success(t('草稿已保存'));
  }

  async function handlePublish() {
    if (videoObjectKey && (!durationSec || durationSec <= 0)) {
      toast.error(t('视频时长异常，请重新上传'));
      return;
    }

    if (!canPublish) {
      return;
    }

    try {
      await publishMutation.mutateAsync({
        data: buildPublishShortVideoRequest({
          title,
          description,
          uploadSessionId: uploadSessionId as number,
          videoObjectKey,
          coverObjectKey,
          durationSec: durationSec as number,
          width: videoWidth as number,
          height: videoHeight as number,
        }),
      });
      if (draftKey) {
        localStorage.removeItem(draftKey);
      }
      await queryClient.invalidateQueries({
        queryKey: getListMyShortVideosQueryKey(),
      });
      toast.success(t('发布成功'));
      await router.navigate({
        to: '/creation-management',
        search: { tab: CreationManagementTab.Videos },
        replace: true,
      });
    } catch {
      toast.error(
        navigator.onLine ? t('发布失败，请重试') : t('网络异常，请检查连接'),
      );
    }
  }

  async function handleUpdate() {
    if (!canUpdate || !editEpisodeIdText) {
      return;
    }

    try {
      await updateMutation.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        ...(coverObjectKey
          ? {
              uploadSessionId,
              coverObjectKey,
            }
          : {}),
      });
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: getListMyShortVideosQueryKey(),
        }),
        queryClient.invalidateQueries({
          queryKey: getCreatorShortVideoEditSessionQueryKey(editEpisodeIdText),
        }),
      ]);
      toast.success(t('保存成功'));
      await router.navigate({
        to: '/creation-management',
        search: { tab: CreationManagementTab.Videos },
        replace: true,
      });
    } catch {
      toast.error(
        navigator.onLine ? t('保存失败，请重试') : t('网络异常，请检查连接'),
      );
    }
  }

  function handleConfirmDeleteVideo() {
    uploadRunIdRef.current += 1;
    videoAbortRef.current?.abort();
    revokeBlobUrl(videoPreviewUrlRef.current);
    videoPreviewUrlRef.current = '';
    setVideoPreviewUrl('');
    setVideoObjectKey('');
    setFileName('');
    setTitle('');
    setFileSizeBytes(undefined);
    setDurationSec(undefined);
    setVideoWidth(undefined);
    setVideoHeight(undefined);
    setUploadStatus('idle');
    setUploadProgress(0);
    if (!hasManualCover) {
      revokeBlobUrl(coverPreviewUrlRef.current);
      coverPreviewUrlRef.current = '';
      setCoverPreviewUrl('');
      setCoverObjectKey('');
    }
    persistDraft({
      videoObjectKey: '',
      fileName: '',
      title: '',
      fileSizeBytes: undefined,
      durationSec: undefined,
      width: undefined,
      height: undefined,
      ...(hasManualCover
        ? {}
        : {
            coverObjectKey: '',
            hasManualCover: false,
          }),
    });
    setDeleteDialogOpen(false);
  }

  function handlePreviewClick() {
    if (videoDisplayUrl) {
      setPreviewDialogOpen(true);
    }
  }

  function renderUploadEmpty() {
    return (
      <section
        className={cn(
          'flex w-full flex-col items-center gap-6 rounded-2xl border border-dashed border-border',
          'bg-create-flow-input-surface px-4 py-7 md:py-8',
        )}
      >
        <div className="flex flex-col items-center gap-3">
          <CloudUpload className="size-11 text-muted-foreground" />
          <div className="flex flex-col items-center gap-1 text-center">
            <h1 className="text-sm leading-5 font-bold text-foreground">
              {t('上传视频文件')}
            </h1>
            <p className="max-w-full text-xs leading-4 text-muted-foreground">
              {t(
                '支持 mp4、flv、wmv、mkv、avi、mov、webm 等格式，文件不超过 2GB',
              )}
            </p>
          </div>
        </div>
        <Button
          type="button"
          className={cn(
            'h-auto w-full rounded-xl bg-foreground px-4 py-2.5',
            'text-sm leading-5 font-bold text-background',
            'hover:bg-foreground/90',
            'md:w-[343px]',
          )}
          onClick={() => videoInputRef.current?.click()}
        >
          {t('选择文件')}
        </Button>
      </section>
    );
  }

  function renderVideoRow() {
    if (!fileName && uploadStatus === 'idle') {
      return renderUploadEmpty();
    }

    const failed = uploadStatus === 'failed';
    const uploading = uploadStatus === 'uploading';
    const complete = uploadStatus === 'success';
    const statusLabel = failed
      ? t('上传失败')
      : uploading
        ? t('上传中')
        : t('上传完成');
    const progressValue = complete ? 100 : uploadProgress;
    const metaParts = [
      getFileExtension(fileName),
      formatFileSizeMeta(fileSizeBytes),
      formatShortVideoDuration(durationSec),
    ].filter(Boolean);

    return (
      <section
        className={cn(
          'flex w-full flex-col gap-4 rounded-2xl border-[0.5px] border-border',
          'bg-create-flow-input-surface p-4 md:h-[228px] md:flex-row md:items-center',
        )}
      >
        <button
          type="button"
          className={cn(
            'relative aspect-[3/4] w-full overflow-hidden rounded-xl border-[0.5px] border-border',
            'bg-muted md:h-[196px] md:w-auto',
          )}
          onClick={handlePreviewClick}
          disabled={!videoDisplayUrl}
          aria-label={t('预览视频')}
        >
          {videoDisplayUrl ? (
            <video
              src={videoDisplayUrl}
              className="pointer-events-none size-full object-cover"
              muted
              playsInline
              preload="metadata"
            />
          ) : (
            <div className="flex size-full items-center justify-center bg-muted" />
          )}
          <span className="absolute inset-0 flex items-center justify-center bg-black/10">
            <Play className="ml-0.5 size-6 fill-white text-white drop-shadow-[0_1px_4px_rgb(0_0_0/0.24)]" />
          </span>
        </button>

        <div className="flex min-w-0 flex-1 flex-col justify-center gap-3">
          <h2 className="truncate text-base leading-6 font-bold text-foreground">
            {title || titleFromVideoFileName(fileName)}
          </h2>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <p className="min-w-0 truncate text-sm leading-5 text-muted-foreground">
              {metaParts.join(' · ')}
            </p>
            <span
              className={cn(
                'shrink-0 rounded-full px-2 py-1 text-xs leading-4 font-medium',
                complete && 'bg-success/10 text-success',
                uploading && 'bg-warning/10 text-warning',
                failed && 'bg-destructive/10 text-destructive',
              )}
            >
              {statusLabel}
            </span>
          </div>

          <Progress
            value={progressValue}
            className="w-full gap-0"
            trackClassName="h-2 rounded-full bg-create-flow-upload-progress-track"
            indicatorClassName={cn(
              'rounded-full',
              failed
                ? progressValue > 0
                  ? 'bg-destructive'
                  : 'bg-transparent'
                : 'bg-create-flow-upload-progress-fill',
            )}
          />
        </div>

        <div className="flex justify-end gap-3 md:items-center">
          {isEditMode ? null : (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn(
                  'size-11 shrink-0 rounded-full bg-secondary',
                  'text-foreground hover:bg-secondary hover:text-foreground',
                )}
                onClick={() => videoInputRef.current?.click()}
                aria-label={t('重新上传')}
              >
                <RefreshCw className="size-6" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn(
                  'size-11 shrink-0 rounded-full bg-secondary',
                  'text-destructive hover:bg-secondary hover:text-destructive',
                )}
                onClick={() => setDeleteDialogOpen(true)}
                aria-label={t('删除视频')}
              >
                <Trash2 className="size-6" />
              </Button>
            </>
          )}
        </div>
      </section>
    );
  }

  return (
    <main
      className={cn(
        'flex min-h-0 w-full min-w-0 flex-1 flex-col',
        'bg-create-flow-page-bg',
      )}
    >
      <ContentContainer
        className={cn(
          'flex w-full flex-col gap-6 py-6 max-md:px-4',
          'md:gap-6 md:py-8',
        )}
      >
        <div className={cn('flex w-full flex-col gap-6', 'md:gap-6')}>
          <PageTitleSection
            title={isEditMode ? t('编辑视频') : t('发布视频')}
          />

          <section
            className={cn(
              'flex flex-col rounded-2xl bg-card',
              'gap-6 p-6 md:p-8',
            )}
          >
            <input
              ref={videoInputRef}
              type="file"
              accept=".mp4,.flv,.wmv,.asf,.mkv,.avi,.rm,.rmvb,.mpg,.mpeg,.mov,.webm,video/*"
              className="sr-only"
              onChange={handleVideoInputChange}
            />
            <input
              ref={coverInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,image/jpeg,image/png"
              className="sr-only"
              onChange={handleCoverInputChange}
            />

            <AppLoadingContainer
              data={[true]}
              isLoading={isEditMode && editSessionQuery.isPending}
              isError={isEditMode && editSessionQuery.isError}
              minHeight={360}
              scrollable={false}
            >
              <div className="flex flex-col gap-6">
                {renderVideoRow()}

                <section className="flex flex-col gap-3">
                  <h2 className="text-base leading-6 font-bold text-foreground">
                    {t('视频封面')}
                  </h2>
                  <div className="flex flex-col gap-4 md:flex-row md:items-end">
                    <div
                      className={cn(
                        'flex h-[196px] w-[147px] items-center justify-center overflow-hidden',
                        'rounded-2xl border border-create-flow-input-border bg-create-flow-input-surface',
                      )}
                    >
                      {coverDisplayUrl ? (
                        <img
                          src={coverDisplayUrl}
                          alt=""
                          className="size-full object-cover"
                          draggable={false}
                        />
                      ) : (
                        <ImageIcon className="size-10 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          'inline-flex h-auto w-[147px] shrink-0 items-center justify-center',
                          'rounded-xl border-[1.5px] border-border bg-background px-6 py-2.5',
                          'text-sm leading-5 font-bold text-foreground',
                          'hover:bg-muted',
                        )}
                        onClick={() => coverInputRef.current?.click()}
                        disabled={
                          !uploadSessionId && uploadStatus === 'uploading'
                        }
                      >
                        {isCoverUploading ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : null}
                        {t('更换封面')}
                      </Button>
                      <p className="text-xs leading-4 text-muted-foreground">
                        {t('支持 JPG/PNG，不超过 5MB')}
                      </p>
                    </div>
                  </div>
                </section>

                <section className="flex flex-col gap-3">
                  <label
                    htmlFor="short-video-description"
                    className="flex items-center gap-2 text-base leading-6 font-bold text-foreground"
                  >
                    {t('描述')}
                    <span className="text-sm leading-5 font-normal text-muted-foreground">
                      {t('（必填）')}
                    </span>
                  </label>
                  <div className="relative">
                    <Textarea
                      id="short-video-description"
                      value={description}
                      maxLength={SHORT_VIDEO_DESCRIPTION_MAX_LENGTH}
                      placeholder={t('添加描述（最多1000字）')}
                      className={cn(
                        'min-h-[104px] resize-none rounded-2xl border-create-flow-input-border',
                        'bg-create-flow-input-surface p-4 pb-9',
                        'text-[15px] leading-[22px] text-foreground placeholder:text-muted-foreground',
                      )}
                      onChange={handleDescriptionChange}
                    />
                    <p className="pointer-events-none absolute right-4 bottom-4 text-xs leading-4 text-muted-foreground">
                      {description.length}/{SHORT_VIDEO_DESCRIPTION_MAX_LENGTH}
                    </p>
                  </div>
                </section>
              </div>
            </AppLoadingContainer>

            <footer
              className={cn(
                'flex w-full flex-row items-stretch gap-3',
                'md:items-center md:justify-end',
              )}
            >
              {isEditMode ? null : (
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    'h-auto min-w-0 flex-1 rounded-xl px-6 py-2.5',
                    'text-sm leading-5 font-bold md:flex-none',
                    'border-[1.5px] border-border text-foreground',
                  )}
                  disabled={uploadStatus === 'uploading' || isCoverUploading}
                  onClick={handleSaveDraft}
                >
                  {t('保存草稿')}
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                className={cn(
                  'h-auto min-w-0 flex-1 rounded-xl px-6 py-2.5',
                  'text-sm leading-5 font-bold md:flex-none',
                  'border-foreground bg-foreground text-background',
                  'hover:bg-foreground/90 hover:text-background',
                )}
                disabled={isEditMode ? !canUpdate : !canPublish}
                onClick={isEditMode ? handleUpdate : handlePublish}
              >
                {publishMutation.isPending || updateMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                {isEditMode ? t('保存修改') : t('发布')}
              </Button>
            </footer>
          </section>
        </div>

        <ShortVideoDeleteConfirmDialog
          open={deleteDialogOpen}
          title={displayTitle}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={handleConfirmDeleteVideo}
        />
        <DramaFlowSecondEpisodeVideoPreviewDialog
          open={previewDialogOpen}
          onOpenChange={setPreviewDialogOpen}
          title={displayTitle}
          videoSrc={videoDisplayUrl ?? null}
        />
        <DramaFlowDramaClearDraftConfirmDialog
          open={clearDraftDialogOpen}
          onOpenChange={setClearDraftDialogOpen}
          onConfirm={handleConfirmClearDraft}
        />
      </ContentContainer>
    </main>
  );
}
