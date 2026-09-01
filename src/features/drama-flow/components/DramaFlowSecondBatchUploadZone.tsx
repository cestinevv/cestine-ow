import { useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import IconEpisodeVideoUpload from '@/assets/svg/IconEpisodeVideoUpload';
import { Button } from '@/components/ui/button';
import { EPISODE_VIDEO_MAX_SIZE_LABEL } from '@/features/drama-flow/utils/dramaFlowEpisodeUploadLimits';
import { cn } from '@/utils';

type CreateSecondBatchUploadZoneProps = {
  disabled?: boolean;
  onFilesAccepted: (files: File[]) => void;
};

const VIDEO_FILE_EXTENSION_PATTERN =
  /\.(mp4|flv|wmv|asf|mkv|avi|rm|rmvb|mpg|mpeg|mov|webm)$/i;

function isAcceptedEpisodeVideoFile(file: File): boolean {
  if (file.type.startsWith('video/')) {
    return true;
  }

  return VIDEO_FILE_EXTENSION_PATTERN.test(file.name);
}

export function DramaFlowSecondBatchUploadZone({
  disabled = false,
  onFilesAccepted,
}: CreateSecondBatchUploadZoneProps) {
  const { t } = useTranslation();
  const fileInputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList?.length) {
      return;
    }

    const videos = Array.from(fileList).filter(isAcceptedEpisodeVideoFile);

    if (videos.length > 0) {
      onFilesAccepted(videos);
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(event.target.files);
    event.target.value = '';
  };

  const handleDragEnter = (event: React.DragEvent) => {
    event.preventDefault();
    if (!disabled) {
      setDragActive(true);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragActive(false);
    if (!disabled) {
      handleFiles(event.dataTransfer.files);
    }
  };

  const handleUploadButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: 批量视频拖放区
    <div
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'flex w-full flex-col items-center gap-4 rounded-2xl border border-dashed border-border',
        'bg-create-flow-input-surface px-4 py-7',
        'md:gap-4 md:py-8',
        dragActive && !disabled
          ? 'border-create-flow-accent bg-create-flow-accent/5'
          : '',
      )}
    >
      <IconEpisodeVideoUpload
        className={cn('size-11 shrink-0 text-muted-foreground', 'md:size-11')}
      />
      <p className={cn('text-sm leading-5 font-bold text-foreground')}>
        {t('点击上传，提交后会按视频名称自动排序')}
      </p>
      <div
        className={cn(
          'flex w-full flex-col gap-1 text-center',
          'text-xs leading-4 font-normal tracking-[0.04px] text-muted-foreground',
        )}
      >
        <p>
          {t(
            '限制文件类型 mp4,flv, wmv, asf, mkv, avi, rm, rmvb, mpg, mpeg, mov, webm',
          )}
        </p>
        <p>
          {t('单文件大小不超过{{maxSize}}', {
            maxSize: EPISODE_VIDEO_MAX_SIZE_LABEL,
          })}
        </p>
      </div>
      <Button
        type="button"
        disabled={disabled}
        onClick={handleUploadButtonClick}
        className={cn(
          'h-auto w-full rounded-xl bg-foreground px-4 py-2.5',
          'text-sm leading-5 font-bold text-background',
          'hover:bg-foreground/90',
          'md:w-[343px]',
        )}
      >
        {t('上传视频')}
      </Button>
      <input
        ref={fileInputRef}
        id={fileInputId}
        type="file"
        multiple
        accept="video/mp4,video/quicktime,video/x-msvideo,video/*"
        className="sr-only"
        onChange={handleInputChange}
      />
    </div>
  );
}
