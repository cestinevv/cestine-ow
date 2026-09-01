import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ChangeEvent } from 'react';
import type { Control } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import IconGripVertical from '@/assets/svg/IconGripVertical';
import IconPlayerPlay from '@/assets/svg/IconPlayerPlay';
import IconRefresh from '@/assets/svg/IconRefresh';
import IconTrash from '@/assets/svg/IconTrash';
import IconVideo from '@/assets/svg/IconVideo';
import { Button } from '@/components/ui/button';
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useEpisodePosterUrl } from '@/features/drama-flow/hooks/useEpisodePosterUrl';
import type { DramaFlowEpisode } from '@/features/drama-flow/types/dramaFlowDocument';
import {
  formatEpisodeMetaLine,
  formatUploadProgressSizeLine,
  splitEpisodeTitleParts,
} from '@/features/drama-flow/utils/dramaFlowEpisodeUtils';
import { isPersistedDramaFlowEpisode } from '@/features/edit/renumberEpisodesForEdit';
import { cn } from '@/utils';

/** Figma 872:170615 — 上传状态 pill 共用尺寸 */
const UPLOAD_STATUS_BADGE_CLASS =
  'shrink-0 rounded-full px-2 py-1 text-xs leading-4 font-medium tracking-[0.04px]';

export type EpisodeDescriptionFormValues = {
  descriptions: Record<string, string>;
};

type CreateSecondEpisodeRowProps = {
  episode: DramaFlowEpisode;
  isUploadingThisEpisode?: boolean;
  isUploadFailed?: boolean;
  uploadProgress?: number | null;
  episodeActionsLocked?: boolean;
  sortableDisabled?: boolean;
  removeDisabled?: boolean;
  canPreviewVideo?: boolean;
  onRefresh: () => void;
  onRemove: () => void;
  onPreview?: () => void;
  onDescriptionChange?: (value: string) => void;
  descriptionControl: Control<EpisodeDescriptionFormValues>;
  descriptionName: `descriptions.${string}`;
};

export function DramaFlowSecondEpisodeRow({
  episode,
  isUploadingThisEpisode = false,
  isUploadFailed = false,
  uploadProgress = null,
  episodeActionsLocked = false,
  sortableDisabled = false,
  removeDisabled = false,
  canPreviewVideo = false,
  onRefresh,
  onRemove,
  onPreview,
  onDescriptionChange,
  descriptionControl,
  descriptionName,
}: CreateSecondEpisodeRowProps) {
  const { t } = useTranslation();

  const isPersistedEpisode = isPersistedDramaFlowEpisode(episode);
  const hasUploadedVideo = Boolean(episode.videoObjectKey?.trim());
  const isHistoricalPersistedVideo =
    isPersistedEpisode &&
    !episode.localFileName?.trim() &&
    Boolean(episode.originalVideoUrl?.trim());
  const hasPendingUpload =
    Boolean(episode.localFileName?.trim()) && !hasUploadedVideo;
  const hasFile = Boolean(
    episode.localFileName?.trim() || hasUploadedVideo || isPersistedEpisode,
  );
  const isComplete =
    (hasUploadedVideo || isHistoricalPersistedVideo) &&
    !isUploadingThisEpisode &&
    !isUploadFailed;
  const showUploadingProgress =
    isUploadingThisEpisode &&
    uploadProgress !== null &&
    uploadProgress !== undefined;
  const showFailedProgress =
    isUploadFailed && uploadProgress !== null && uploadProgress !== undefined;
  const showProgressBar =
    showUploadingProgress ||
    showFailedProgress ||
    isComplete ||
    hasPendingUpload;
  const progressValue =
    showUploadingProgress || showFailedProgress
      ? Math.min(100, uploadProgress ?? 0)
      : 0;
  const metaLine = formatEpisodeMetaLine(episode);
  const showUploadedSize = showUploadingProgress || showFailedProgress;
  const uploadedSizeLine = showUploadedSize
    ? formatUploadProgressSizeLine(
        (episode.localFileSizeBytes ?? 0) * (progressValue / 100),
        episode.localFileSizeBytes,
      )
    : '';
  const { posterUrl, showHistoricalPlaceholder } = useEpisodePosterUrl(episode);

  const renderEpisodeThumbnail = () => {
    if (posterUrl) {
      return <img src={posterUrl} alt="" className="size-full object-cover" />;
    }

    if (showHistoricalPlaceholder) {
      return (
        <Tooltip>
          <TooltipTrigger
            render={
              <div
                className={cn(
                  'flex size-full cursor-default items-center justify-center',
                  'rounded-lg border-[0.5px] border-create-flow-input-border',
                  'bg-create-flow-episode-poster-placeholder',
                  'md:rounded-xl',
                )}
              />
            }
          >
            <IconVideo className="size-6 text-muted-foreground" />
          </TooltipTrigger>
          <TooltipContent
            side="top"
            className={cn(
              'max-w-none rounded-xl px-4 py-2.5',
              'text-sm leading-5 font-normal',
            )}
          >
            {t('历史上传视频，暂不支持播放预览')}
          </TooltipContent>
        </Tooltip>
      );
    }

    return <div className="size-full bg-muted" />;
  };

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: episode.clientId,
    disabled: !hasFile || episodeActionsLocked || sortableDisabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const gripSortableProps =
    hasFile && !episodeActionsLocked && !sortableDisabled
      ? { ...attributes, ...listeners }
      : {};

  const handleRefreshClick = () => {
    onRefresh();
  };

  const handleRemoveClick = () => {
    onRemove();
  };

  const handlePreviewClick = () => {
    onPreview?.();
  };

  const { baseName: titleBaseName, extension: titleExtension } =
    splitEpisodeTitleParts(episode);
  const episodeTitleFull = titleExtension
    ? `${titleBaseName} . ${titleExtension}`
    : titleBaseName;

  const renderGripButton = (className?: string) => (
    <button
      type="button"
      className={cn(
        'flex shrink-0 touch-none items-center justify-center',
        hasFile && !episodeActionsLocked && !sortableDisabled
          ? 'cursor-grab text-muted-foreground'
          : 'cursor-not-allowed text-muted-foreground/30',
        className,
      )}
      aria-label={t('拖拽排序')}
      disabled={!hasFile || episodeActionsLocked || sortableDisabled}
      {...gripSortableProps}
    >
      <IconGripVertical className="size-6" />
    </button>
  );

  const renderEpisodeNumber = (className?: string) => (
    <span
      className={cn(
        'w-10 shrink-0 text-center text-base leading-6 font-bold text-actor-search-badge-community',
        className,
      )}
    >
      {episode.episodeNo}
    </span>
  );

  const renderThumbnail = () => (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden border-[0.5px] border-create-flow-input-border',
        'h-14 w-[67px] rounded-lg',
        'md:h-24 md:w-[101px] md:rounded-xl lg:w-[115px]',
      )}
    >
      {canPreviewVideo ? (
        <Button
          type="button"
          variant="ghost"
          onClick={handlePreviewClick}
          className={cn(
            'relative size-full overflow-hidden rounded-lg p-0',
            'hover:bg-transparent md:rounded-xl',
          )}
          aria-label={t('播放预览')}
        >
          {renderEpisodeThumbnail()}
          <span
            className={cn(
              'pointer-events-none absolute inset-0 flex items-center justify-center',
            )}
          >
            <IconPlayerPlay className="size-6 text-white" />
          </span>
        </Button>
      ) : (
        renderEpisodeThumbnail()
      )}
    </div>
  );

  // Figma 872:170615 — 标题为纯文本：文件名 Bold 16/24，扩展名 Regular
  const renderTitleDisplay = (className?: string) => (
    <p
      className={cn(
        'min-w-0 truncate text-sm leading-5 text-foreground',
        'md:text-base md:leading-6',
        className,
      )}
      title={episodeTitleFull === '-' ? undefined : episodeTitleFull}
    >
      <span className="font-bold">{titleBaseName}</span>
      {titleExtension ? (
        <span className="font-normal">{` . ${titleExtension}`}</span>
      ) : null}
    </p>
  );

  const renderActionButtons = () => (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleRefreshClick}
        className={cn(
          'size-11 shrink-0 rounded-full bg-card',
          'text-foreground hover:bg-card hover:text-foreground',
          'aria-expanded:bg-card',
          'md:size-14',
        )}
        aria-label={t('重新上传')}
      >
        <IconRefresh className="size-6 shrink-0" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleRemoveClick}
        disabled={removeDisabled || episodeActionsLocked}
        className={cn(
          'size-11 shrink-0 rounded-full bg-card',
          'aria-expanded:bg-card',
          'md:size-14',
          removeDisabled
            ? 'cursor-not-allowed text-muted-foreground/30 hover:bg-card hover:text-muted-foreground/30'
            : 'text-destructive hover:bg-card hover:text-destructive',
        )}
        aria-label={t('删除该剧集')}
      >
        <IconTrash className="size-6 shrink-0" />
      </Button>
    </>
  );

  const renderMetaAndProgress = () => (
    <>
      <div className={cn('flex w-full min-w-0 items-center gap-2')}>
        {metaLine ? (
          <span
            className={cn(
              'min-w-0 truncate text-xs leading-4 font-normal text-muted-foreground',
              'md:text-sm md:leading-5',
            )}
          >
            {metaLine}
          </span>
        ) : null}
        {isUploadingThisEpisode ? (
          <span
            className={cn(
              UPLOAD_STATUS_BADGE_CLASS,
              'bg-game-risk-badge-surface text-game-risk-badge-text',
            )}
          >
            {t('上传中')}
          </span>
        ) : null}
        {isUploadFailed ? (
          <span
            className={cn(
              UPLOAD_STATUS_BADGE_CLASS,
              'bg-destructive/15 text-destructive',
            )}
          >
            {t('上传失败')}
          </span>
        ) : null}
        {isComplete ? (
          <span
            className={cn(
              UPLOAD_STATUS_BADGE_CLASS,
              'bg-success/16 text-success',
            )}
          >
            {t('上传完成')}
          </span>
        ) : null}
        {uploadedSizeLine ? (
          <span
            className={cn(
              'ml-auto shrink-0 text-xs leading-4 font-normal text-muted-foreground',
              'md:text-sm md:leading-5',
            )}
          >
            {uploadedSizeLine}
          </span>
        ) : null}
      </div>
      {showProgressBar ? (
        <Progress
          value={isComplete ? 100 : progressValue}
          className="w-full gap-0"
          trackClassName="h-2 rounded-full bg-create-flow-upload-progress-track"
          indicatorClassName={cn(
            'rounded-full',
            isUploadFailed
              ? progressValue > 0
                ? 'bg-destructive'
                : 'bg-transparent'
              : 'bg-foreground',
          )}
        />
      ) : null}
      {hasFile ? (
        <FormField
          control={descriptionControl}
          name={descriptionName}
          render={({ field }) => (
            <FormItem className="gap-1">
              <FormControl>
                <Input
                  {...field}
                  value={String(field.value ?? '')}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => {
                    field.onChange(event);
                    onDescriptionChange?.(event.target.value);
                  }}
                  placeholder={t('请输入分集描述')}
                  maxLength={1000}
                  className={cn(
                    'h-auto rounded-xl border-[0.5px] border-create-flow-input-border bg-card px-3 py-3',
                    'text-[15px] leading-[22px] text-foreground placeholder:text-muted-foreground',
                  )}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : null}
    </>
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex w-full min-w-0 flex-col gap-3 rounded-2xl border-[0.5px] border-border',
        'bg-create-flow-input-surface p-4',
        'md:flex-row md:items-center md:gap-4',
        isDragging && 'relative z-10 opacity-50',
      )}
    >
      <div
        className={cn('flex w-full items-center justify-between', 'md:hidden')}
      >
        <div className={cn('flex items-start gap-4')}>
          {renderGripButton()}
          {renderEpisodeNumber()}
        </div>
        <div className={cn('flex items-start gap-4')}>
          {renderActionButtons()}
        </div>
      </div>

      {renderGripButton('hidden md:flex')}
      {renderEpisodeNumber('hidden md:block')}

      <div
        className={cn(
          'flex w-full min-w-0 flex-col gap-4',
          'md:min-w-0 md:flex-1 md:flex-row md:items-center md:gap-4',
        )}
      >
        <div
          className={cn(
            'flex w-full min-w-0 items-center gap-2',
            'md:w-auto md:shrink-0',
          )}
        >
          {renderThumbnail()}
          {renderTitleDisplay('min-w-0 flex-1 md:hidden')}
        </div>

        <div className={cn('flex min-w-0 flex-1 flex-col gap-2')}>
          {renderTitleDisplay('hidden md:block')}
          {renderMetaAndProgress()}
        </div>
      </div>

      <div className={cn('hidden shrink-0 items-center gap-4', 'md:flex')}>
        {renderActionButtons()}
      </div>
    </div>
  );
}
