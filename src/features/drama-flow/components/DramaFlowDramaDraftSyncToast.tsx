import { Button } from '@/components/ui/button';
import { cn } from '@/utils';

type CreateDramaDraftSyncToastProps = {
  message: string;
  clearLabel: string;
  onClearClick: () => void;
};

export function DramaFlowDramaDraftSyncToast({
  message,
  clearLabel,
  onClearClick,
}: CreateDramaDraftSyncToastProps) {
  // 用户点击 Toast 内「清除数据」：打开二次确认弹窗（不在此直接清空 store）。
  const handleClearClick = () => {
    onClearClick();
  };

  return (
    <div
      className={cn(
        // Layout — Figma 2254:6857 固定宽 500px，左侧 flex-1 撑开文案与按钮间距
        'flex w-[min(100vw-2rem,500px)] items-center gap-2',
        // Spacing — pl 16 / pr 10 / py 10
        'py-2.5 pl-4 pr-2.5',
        // Visual — Figma 2254:6857；深色走 create-draft-toast-* token
        'rounded-lg border border-create-draft-toast-bg bg-create-draft-toast-bg',
        'shadow-create-draft-toast',
      )}
    >
      <div className={cn('flex min-w-0 flex-1 items-center gap-4 py-0.5')}>
        <span
          className={cn(
            'flex size-5 shrink-0 items-center justify-center rounded-full',
            'bg-success',
          )}
          aria-hidden
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            role="presentation"
            className={cn('size-3 text-success-foreground')}
            aria-hidden
          >
            <path
              d="M6 12.5L10.5 17L18 8"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <p
          className={cn(
            'min-w-0 flex-1 text-sm leading-5 font-normal text-foreground',
          )}
        >
          {message}
        </p>
      </div>
      <Button
        type="button"
        variant="ghost"
        onClick={handleClearClick}
        className={cn(
          'h-auto shrink-0 rounded px-3 py-[5px]',
          'bg-success/15 text-[13px] leading-[18px] font-medium text-success',
          'hover:bg-success/25',
        )}
      >
        {clearLabel}
      </Button>
    </div>
  );
}
