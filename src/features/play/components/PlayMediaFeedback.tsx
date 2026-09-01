import { useTranslation } from 'react-i18next';

import IconLoading2 from '@/assets/svg/IconLoading2';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils';

/**
 * 播放器统一加载提示（详情页与 H5 共用）：旋转 loading 图标 + 可选文案。
 * `dim` 用于首屏 / 取地址阶段叠一层暗背景；播放中 rebuffer 不传 `dim`，避免压暗画面。
 */
export function PlayMediaLoadingOverlay({
  label,
  dim = false,
}: {
  label?: string;
  dim?: boolean;
}) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 z-30 flex items-center justify-center',
        dim && 'bg-black/40',
      )}
    >
      <div className="flex flex-col items-center gap-3">
        <IconLoading2 className="size-8 animate-spin text-muted-foreground" />
        {label ? (
          <p className="text-[15px] leading-5.5 text-muted-foreground">
            {label}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** 新发布视频后台转码中：Figma 1810:184509 封面底上居中文案（1810:185025） */
export function PlayMediaTranscodingOverlay() {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 z-30 flex items-center justify-center',
      )}
    >
      <div className="flex max-w-41 flex-col items-center gap-3">
        <IconLoading2 className="size-8 shrink-0 animate-spin text-white/80" />
        <p
          className={cn(
            'text-center text-[15px] leading-[22px] text-white/80',
            'text-shadow-[0.5px_0.5px_1px_rgba(0,0,0,0.25)]',
          )}
        >
          {t('视频正在解码处理，请稍作等待...')}
        </p>
      </div>
    </div>
  );
}

/**
 * 浏览器不支持 HLS 播放时的兜底提示（既无 MSE 也无原生 HLS）。
 * 常见于部分旧版小米/OPPO/VIVO 系统浏览器。
 */
export function PlayBrowserUnsupportedOverlay() {
  const { t } = useTranslation();

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/70">
      <p className="px-8 text-center text-sm leading-6 text-white">
        {t('当前浏览器不支持视频播放，建议使用 Chrome 浏览器')}
      </p>
    </div>
  );
}

/**
 * 播放器统一错误兜底（详情页与 H5 共用）：失败文案 + 重试按钮。
 * 用于集详情接口拉取失败、无法得到播放地址的场景。
 */
export function PlayMediaErrorOverlay({
  message,
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60">
      <div className="flex flex-col items-center gap-4 px-6 text-center">
        <p className="text-sm leading-5 text-white md:text-base">
          {message ?? t('加载失败')}
        </p>
        {onRetry ? (
          <Button
            type="button"
            variant="secondary"
            onClick={onRetry}
            className="rounded-full"
          >
            {t('重试')}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
