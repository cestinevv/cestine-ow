import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import IconChevronLeft from '@/assets/svg/IconChevronLeft';
import IconCircleCheck from '@/assets/svg/IconCircleCheck';
import IconCircleCheckSolid from '@/assets/svg/IconCircleCheckSolid';
import { UserProfileAvatarCircle } from '@/components/common/UserProfileAvatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { buildMiniDramaPublicObjectUrl, cn } from '@/utils';

/** Figma 1061:116020 / 496:1160 / 496:1140 — 跟进卡片操作按钮三态 */
type UgcReportFollowUpCompletedVisual = 'outline' | 'unavailable';

function getUgcReportFollowUpActionButtonClass(
  isCompleted: boolean,
  completedVisual: UgcReportFollowUpCompletedVisual,
  isPending?: boolean,
) {
  const base = cn(
    'inline-flex h-auto min-h-8 shrink-0 items-center justify-center rounded-xl border',
    'px-4 py-[5px]',
    'text-[13px] leading-[18px] font-bold',
    'disabled:opacity-100',
  );

  if (isCompleted) {
    if (completedVisual === 'outline') {
      // Figma 496:1160 — 已拉黑：border/secondary + text/primary，无填充
      return cn(
        base,
        'border-border bg-transparent text-foreground',
        'hover:bg-transparent hover:text-foreground',
        'disabled:border-border disabled:bg-transparent disabled:text-foreground',
      );
    }

    // Figma 496:1140 — 已减少推荐：page&sheet/unavailable + white-to-secondary
    return cn(
      base,
      'border-transparent bg-button-disabled-surface text-button-disabled-on-surface',
      'hover:bg-button-disabled-surface hover:text-button-disabled-on-surface',
      'disabled:border-transparent disabled:bg-button-disabled-surface disabled:text-button-disabled-on-surface',
    );
  }

  // Figma 496:1120 — 默认 / loading：page&sheet/dark + white-to-dark
  return cn(
    base,
    'border-transparent bg-foreground text-background',
    'hover:bg-foreground/90 hover:text-background',
    isPending && 'pointer-events-none',
  );
}

/** Figma 1003:135246 / 1003:135784 — 完成 / 表单主按钮 */
const UGC_REPORT_PRIMARY_BUTTON_CLASS = cn(
  'h-11 rounded-xl px-4 py-2.5',
  'text-[14px] leading-5 font-bold',
  'bg-foreground text-background',
  'hover:bg-foreground/90 hover:text-background',
);

/** Figma 1003:135890 — 取消 */
const UGC_REPORT_SECONDARY_BUTTON_CLASS = cn(
  'h-11 rounded-xl px-4 py-2.5',
  'border-[1.5px] border-wallet-divider bg-background',
  'text-[14px] leading-5 font-bold text-foreground',
  'hover:bg-muted/50',
);

export type UgcReportFormValue = {
  reportType: string;
  description?: string;
};

export type UgcReportReasonOption = {
  code: string;
  name: string;
};

export type UgcReportSuccessFollowUp = {
  id: string;
  displayName: string;
  actionLabelKey: string;
  /** 已完成态文案 key（如已拉黑 / 已减少推荐） */
  completedLabelKey?: string;
  /** Figma 496:1160 描边完成态 / 496:1140 unavailable 完成态 */
  completedVisual?: UgcReportFollowUpCompletedVisual;
  onAction: () => void;
  isPending?: boolean;
  disabled?: boolean;
  /** 用户头像：配合 userId 展示 Stamp / 自定义头像 */
  userId?: string;
  avatarUrl?: string;
  /** 视频/短剧封面（与头像互斥，优先展示封面） */
  coverUrl?: string;
};

function resolveUgcReportCoverUrl(coverUrl?: string): string | undefined {
  const raw = coverUrl?.trim();
  if (!raw) {
    return undefined;
  }

  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }

  return buildMiniDramaPublicObjectUrl(raw);
}

function UgcReportFollowUpThumbnail({
  userId,
  avatarUrl,
  coverUrl,
  displayName,
}: {
  userId?: string;
  avatarUrl?: string;
  coverUrl?: string;
  displayName: string;
}) {
  const [coverFailed, setCoverFailed] = useState(false);
  const resolvedCoverUrl = resolveUgcReportCoverUrl(coverUrl);
  const fallbackChar = displayName.slice(0, 1) || '?';

  if (resolvedCoverUrl && !coverFailed) {
    return (
      <img
        alt=""
        src={resolvedCoverUrl}
        width={44}
        height={44}
        className="size-full rounded-full object-cover"
        loading="lazy"
        onError={() => setCoverFailed(true)}
      />
    );
  }

  if (coverUrl?.trim()) {
    return (
      <span
        className={cn(
          'flex size-full items-center justify-center rounded-full',
          'bg-language-switcher-active text-sm font-bold text-white',
        )}
        aria-hidden
      >
        {fallbackChar}
      </span>
    );
  }

  return (
    <UserProfileAvatarCircle
      userId={userId}
      avatarUrl={avatarUrl}
      fallbackChar={fallbackChar}
      size={44}
      containerClassName="size-full"
    />
  );
}

function UgcReportSuccessIcon() {
  return (
    <div
      className={cn(
        // Figma 1003:135233 — green-alpha-4 外圈 + 24 实心绿勾
        'flex size-11 items-center justify-center rounded-full p-2.5',
        'bg-success/16 text-success',
      )}
    >
      <IconCircleCheckSolid className="size-6" />
    </div>
  );
}

function UgcReportFollowUpCard({
  userId,
  avatarUrl,
  coverUrl,
  displayName,
  actionLabel,
  completedLabel,
  completedVisual = 'outline',
  isPending,
  disabled,
  onAction,
}: {
  userId?: string;
  avatarUrl?: string;
  coverUrl?: string;
  displayName: string;
  actionLabel: string;
  completedLabel?: string;
  completedVisual?: UgcReportFollowUpCompletedVisual;
  isPending?: boolean;
  disabled?: boolean;
  onAction: () => void;
}) {
  const isCompleted = Boolean(disabled) && !isPending;
  const buttonLabel =
    isCompleted && completedLabel ? completedLabel : actionLabel;

  function handleActionClick() {
    if (isPending || isCompleted) {
      return;
    }

    onAction();
  }

  return (
    <article
      className={cn(
        'flex w-full items-center gap-1.5 rounded-xl border-[0.5px] border-white/15',
        'bg-muted p-2 text-left backdrop-blur-[2.5px]',
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden">
        <div className="size-11 shrink-0 overflow-hidden rounded-full">
          <UgcReportFollowUpThumbnail
            userId={userId}
            avatarUrl={avatarUrl}
            coverUrl={coverUrl}
            displayName={displayName}
          />
        </div>
        <p
          className="min-w-0 flex-1 truncate text-left text-[15px] leading-[22px] font-bold text-foreground"
          title={displayName}
        >
          {displayName}
        </p>
      </div>
      <Button
        type="button"
        variant="ghost"
        disabled={isCompleted}
        aria-busy={isPending}
        onClick={handleActionClick}
        className={getUgcReportFollowUpActionButtonClass(
          isCompleted,
          completedVisual,
          isPending,
        )}
      >
        {isPending ? (
          <Spinner
            className={cn(
              'size-3.5 shrink-0',
              isCompleted
                ? 'text-button-disabled-on-surface'
                : 'text-background',
            )}
          />
        ) : (
          <span className="whitespace-nowrap">{buttonLabel}</span>
        )}
      </Button>
    </article>
  );
}

const UGC_REPORT_REASON_SKELETON_ROWS = [
  'reason-skeleton-1',
  'reason-skeleton-2',
  'reason-skeleton-3',
  'reason-skeleton-4',
  'reason-skeleton-5',
] as const;

function UgcReportReasonListSkeleton() {
  return (
    <div className="flex w-full flex-col" aria-busy="true" aria-live="polite">
      {UGC_REPORT_REASON_SKELETON_ROWS.map((rowKey) => (
        <div
          key={rowKey}
          className={cn(
            'flex w-full items-center justify-between border-b-[0.5px] border-wallet-divider px-4 py-3',
          )}
        >
          <Skeleton className="h-5 w-[min(72%,220px)] rounded-md" />
          <Skeleton className="size-6 shrink-0 rounded-full" />
        </div>
      ))}
    </div>
  );
}

function UgcReportDescriptionSkeleton() {
  return (
    <div className="flex w-full flex-col gap-2 md:px-4">
      <Skeleton className="h-4 w-16 rounded-md" />
      <Skeleton className="min-h-[72px] w-full rounded-2xl" />
    </div>
  );
}

export function UgcReportDialog({
  open,
  isSubmitting,
  isReasonsLoading = false,
  reasonOptions,
  submitted,
  successFollowUps = [],
  onCancel,
  onSubmit,
  onDone,
}: {
  open: boolean;
  isSubmitting: boolean;
  isReasonsLoading?: boolean;
  reasonOptions: UgcReportReasonOption[];
  submitted: boolean;
  successFollowUps?: UgcReportSuccessFollowUp[];
  onCancel: () => void;
  onSubmit: (value: UgcReportFormValue) => void;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const [reasonCode, setReasonCode] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!open) {
      return;
    }

    const firstReasonCode = reasonOptions[0]?.code ?? '';

    if (!reasonOptions.some((option) => option.code === reasonCode)) {
      setReasonCode(firstReasonCode);
    }
  }, [open, reasonCode, reasonOptions]);

  function handleSubmit() {
    if (!reasonCode) {
      return;
    }

    onSubmit({
      reportType: reasonCode,
      description: description.trim() || undefined,
    });
  }

  function handleDone() {
    setDescription('');
    setReasonCode(reasonOptions[0]?.code ?? '');
    onDone();
  }

  const visibleFollowUps = successFollowUps.filter(
    (item) => item.displayName.trim().length > 0,
  );
  const showReasonSkeleton = isReasonsLoading && reasonOptions.length === 0;

  return (
    <Dialog open={open} onOpenChange={() => undefined}>
      <DialogContent
        bare
        bodyScroll={false}
        className={cn(
          'w-full gap-0 border-0 bg-card p-0',
          'max-md:h-dvh max-md:max-h-dvh max-md:rounded-none max-md:border-0',
          'md:max-w-[500px] md:rounded-2xl',
          submitted && 'md:max-w-[343px]',
        )}
      >
        <div
          className={cn(
            'flex min-h-0 w-full flex-1 flex-col',
            submitted ? 'gap-6 p-4' : 'max-md:h-full md:gap-6 md:p-4',
          )}
        >
          {submitted ? (
            <>
              <div className="flex w-full flex-col items-center gap-4 pt-2 text-center">
                <UgcReportSuccessIcon />
                <div className="flex w-full flex-col gap-1">
                  <p className="text-base leading-6 font-bold text-foreground">
                    {t('已收到反馈，平台将尽快处理')}
                  </p>
                  <p className="text-sm leading-5 font-medium text-foreground">
                    {t('感谢您对社区安全做的贡献！')}
                  </p>
                </div>
                {visibleFollowUps.length > 0 ? (
                  <>
                    <p className="w-full text-sm leading-5 font-medium text-foreground">
                      {t('同时你可以')}
                    </p>
                    <div className="flex w-full flex-col gap-2 text-left">
                      {visibleFollowUps.map((item) => (
                        <UgcReportFollowUpCard
                          key={item.id}
                          userId={item.userId}
                          avatarUrl={item.avatarUrl}
                          coverUrl={item.coverUrl}
                          displayName={item.displayName}
                          actionLabel={t(item.actionLabelKey)}
                          completedLabel={
                            item.completedLabelKey
                              ? t(item.completedLabelKey)
                              : undefined
                          }
                          completedVisual={item.completedVisual}
                          isPending={item.isPending}
                          disabled={item.disabled}
                          onAction={item.onAction}
                        />
                      ))}
                    </div>
                  </>
                ) : null}
              </div>
              <Button
                type="button"
                onClick={handleDone}
                className={cn(UGC_REPORT_PRIMARY_BUTTON_CLASS, 'w-full')}
              >
                {t('完成')}
              </Button>
            </>
          ) : (
            <>
              <header
                className={cn(
                  'flex w-full shrink-0 items-center',
                  'max-md:h-11 max-md:px-4 md:justify-center',
                )}
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={onCancel}
                  className={cn(
                    'size-6 rounded-none p-0 md:hidden',
                    'text-foreground hover:bg-transparent',
                  )}
                  aria-label={t('返回')}
                >
                  <IconChevronLeft className="size-6" />
                </Button>
                <DialogTitle
                  className={cn(
                    'min-w-0 flex-1 text-center text-lg leading-[26px] font-bold tracking-[-0.04px] text-foreground',
                    'max-md:pr-6 md:w-full',
                  )}
                >
                  {t('举报')}
                </DialogTitle>
              </header>

              <div
                className={cn(
                  'flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto',
                  'max-md:px-4 max-md:pb-28 md:pb-0',
                )}
              >
                {showReasonSkeleton ? (
                  <>
                    <div className="relative flex w-full flex-col">
                      <UgcReportReasonListSkeleton />
                      <div
                        className={cn(
                          'pointer-events-none absolute inset-0 flex items-center justify-center',
                          'bg-card/40',
                        )}
                      >
                        <Spinner className="size-6 text-muted-foreground" />
                      </div>
                    </div>
                    <UgcReportDescriptionSkeleton />
                  </>
                ) : (
                  <>
                    <div className="flex w-full flex-col">
                      {reasonOptions.map((option) => {
                        const checked = option.code === reasonCode;

                        return (
                          <Button
                            key={option.code}
                            type="button"
                            variant="outline"
                            onClick={() => setReasonCode(option.code)}
                            className={cn(
                              'h-auto w-full justify-between rounded-xl border-0 border-b-[0.5px] border-wallet-divider px-4 py-3',
                              'bg-transparent text-sm leading-5 font-normal text-foreground shadow-none',
                              checked
                                ? 'md:bg-page-thirdly md:hover:bg-page-thirdly'
                                : 'hover:bg-transparent',
                            )}
                          >
                            {option.name}
                            <IconCircleCheck
                              selected={checked}
                              className={cn(
                                'size-6 shrink-0',
                                checked
                                  ? 'text-foreground'
                                  : 'text-muted-foreground',
                              )}
                            />
                          </Button>
                        );
                      })}
                    </div>

                    <div className="flex w-full flex-col gap-2 md:px-4">
                      <p className="text-xs leading-4 font-medium tracking-[0.04px] text-wallet-text-secondary">
                        {t('举报描述')}
                      </p>
                      <Textarea
                        value={description}
                        maxLength={500}
                        onChange={(event) => setDescription(event.target.value)}
                        placeholder={t('请描述具体原因（选填）')}
                        className={cn(
                          'min-h-[72px] resize-none rounded-2xl border border-border',
                          'bg-points-page-surface-muted p-4 text-sm leading-5 text-foreground',
                          'placeholder:text-muted-foreground',
                        )}
                      />
                    </div>
                  </>
                )}
              </div>

              <div
                className={cn(
                  'flex w-full shrink-0 gap-3',
                  'max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:border-0 max-md:bg-card max-md:px-4 max-md:pt-1 max-md:pb-[max(1rem,env(safe-area-inset-bottom))]',
                  'md:static md:px-0 md:pb-0 md:pt-0',
                )}
              >
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={onCancel}
                  className={cn(
                    UGC_REPORT_SECONDARY_BUTTON_CLASS,
                    'min-w-0 flex-1 max-md:hidden',
                  )}
                >
                  {t('取消')}
                </Button>
                <Button
                  type="button"
                  disabled={isSubmitting || showReasonSkeleton || !reasonCode}
                  onClick={handleSubmit}
                  className={cn(
                    UGC_REPORT_PRIMARY_BUTTON_CLASS,
                    'min-w-0 flex-1 max-md:w-full max-md:flex-none',
                  )}
                >
                  {isSubmitting ? <Spinner className="mr-1 size-4" /> : null}
                  {t('举报')}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
