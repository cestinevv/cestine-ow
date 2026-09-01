import { useMediaRemote, useMediaState } from '@vidstack/react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/utils';

type PlayVideoTapToToggleProps = {
  className?: string;
  /** 为 true 时不响应点击（如选集 Sheet 打开时） */
  disabled?: boolean;
  onUserPause?: () => void;
  onUserPlay?: () => void;
};

/** 须在 MediaPlayer 内使用：单击画面切换播放/暂停，桌面 click 与移动端 touch 均可用 */
export function PlayVideoTapToToggle({
  className,
  disabled = false,
  onUserPause,
  onUserPlay,
}: PlayVideoTapToToggleProps) {
  const { t } = useTranslation();
  const remote = useMediaRemote();
  const paused = useMediaState('paused');
  const canPlay = useMediaState('canPlay');

  if (disabled || !canPlay) {
    return null;
  }

  const handleToggle = () => {
    if (paused) {
      onUserPlay?.();
      void remote.play();
      return;
    }

    onUserPause?.();
    remote.pause();
  };

  return (
    <button
      type="button"
      aria-label={paused ? t('播放') : t('暂停')}
      className={cn('absolute inset-0 z-20 border-0 bg-transparent', className)}
      onClick={handleToggle}
    />
  );
}
