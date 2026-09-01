import { useQueryClient } from '@tanstack/react-query';
import type { SVGProps } from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import {
  getListShareAttemptsQueryKey,
  useSubmitShareAttempt,
} from '@/api/__generated__/wallet/activity-share/activity-share';
import type { ShareAttemptResponse } from '@/api/__generated__/wallet/model/shareAttemptResponse';
import {
  SubmitShareAttemptRequestPlatform as SharePlatform,
  type SubmitShareAttemptRequestPlatform,
} from '@/api/__generated__/wallet/model/submitShareAttemptRequestPlatform';
import IconCopy from '@/assets/svg/IconCopy';
import IconHelpCircle from '@/assets/svg/IconHelpCircle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GameDialogSubmitLabel } from '@/features/game/components/GameDialogSubmitLabel';
import { useConfigStore } from '@/stores/config';
import { cn } from '@/utils';

import {
  getStory1011ShareUiState,
  resolveStory1011ActivityConfig,
  Story1011ShareUiState,
} from '../utils/story1011Format';

/** 平台随机码引导后缀（稿面：填入 {平台} 视频介绍） */
const SHARE_CODE_HINT_SUFFIX_KEY: Record<
  SubmitShareAttemptRequestPlatform,
  string
> = {
  [SharePlatform.x]: '填入 X 视频介绍',
  [SharePlatform.tiktok]: '填入 TikTok 视频介绍',
  [SharePlatform.youtube]: '填入 YouTube 视频介绍',
};

type Story1011SharePlatformRowProps = {
  platform: SubmitShareAttemptRequestPlatform;
  placeholderKey: string;
  attempt: ShareAttemptResponse | undefined;
  /** 矢量图标（如 X） */
  Icon?: (props: SVGProps<SVGSVGElement>) => React.ReactNode;
  /** 品牌色位图（如 TikTok / YouTube） */
  iconSrc?: string;
};

export function Story1011SharePlatformRow({
  platform,
  placeholderKey,
  Icon,
  iconSrc,
  attempt,
}: Story1011SharePlatformRowProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const activityConfig = useConfigStore((state) => state.activityConfig);
  const activityId = resolveStory1011ActivityConfig(activityConfig)?.activityId;
  const submitMutation = useSubmitShareAttempt();
  const [isRejectionTooltipOpen, setIsRejectionTooltipOpen] = useState(false);
  const uiState = getStory1011ShareUiState(attempt);
  const isPending = uiState === Story1011ShareUiState.Pending;
  const isApproved = uiState === Story1011ShareUiState.Approved;
  const isRejected = uiState === Story1011ShareUiState.Rejected;
  const isReadonly = isPending || isApproved;
  const [url, setUrl] = useState(attempt?.shareUrl ?? '');
  const rejectionReason = attempt?.rejectionReason?.trim();

  // 列表接口返回的 SF 短码；各审核态均展示，无值时不编造
  const shareCode = attempt?.code?.trim() ?? '';
  const canCopyCode = shareCode.length > 0;

  useEffect(() => {
    if (isReadonly) {
      setUrl(attempt?.shareUrl ?? '');
      return;
    }

    // 未通过可重新编辑：保留驳回链接便于修改后重提
    if (isRejected && attempt?.shareUrl) {
      setUrl(attempt.shareUrl);
    }
  }, [attempt?.shareUrl, isReadonly, isRejected]);

  const displayUrl = isReadonly ? (attempt?.shareUrl ?? '') : url;

  /** 复制随机码到剪贴板 */
  async function handleCopyCode() {
    if (!canCopyCode) {
      return;
    }

    try {
      await navigator.clipboard.writeText(shareCode);
      toast.success(t('随机码已复制'));
    } catch {
      toast.error(t('再试一次'));
    }
  }

  /** 切换未通过原因气泡（移动端点击） */
  function handleRejectionReasonClick() {
    if (!rejectionReason) {
      return;
    }

    setIsRejectionTooltipOpen((open) => !open);
  }

  /** 提交分享链接审核 */
  async function handleSubmit() {
    const trimmed = url.trim();

    if (!trimmed) {
      toast.error(t('请填写分享链接'));
      return;
    }

    if (activityId == null) {
      return;
    }

    try {
      await submitMutation.mutateAsync({
        activityId,
        data: { platform, shareUrl: trimmed },
      });
      await queryClient.invalidateQueries({
        queryKey: getListShareAttemptsQueryKey(activityId),
      });
    } catch {
      /* appAxiosInstance 已 toast */
    }
  }

  return (
    <div
      className={cn(
        // Layout — Figma 7354:24870；relative + overflow-visible：移动端未通过气泡相对整行铺满，避免被裁切
        'relative flex w-full flex-col gap-2.5 overflow-visible rounded bg-story-checkin-control p-4',
      )}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <p className="m-0 min-w-0 text-xs leading-4 tracking-[0.04px] text-foreground">
          <span>{t('将随机码')}</span>
          <span className="text-story-checkin-accent">
            {shareCode ? ` ${shareCode} ` : ' '}
          </span>
          <span>{t(SHARE_CODE_HINT_SUFFIX_KEY[platform])}</span>
        </p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={!canCopyCode}
          onClick={handleCopyCode}
          aria-label={t('复制随机码')}
          className={cn(
            'size-5 shrink-0 rounded-none text-muted-foreground',
            'hover:bg-transparent hover:text-foreground',
            'disabled:opacity-40',
          )}
        >
          <IconCopy className="size-4" />
        </Button>
      </div>

      <div
        className="h-px w-full shrink-0 bg-story-checkin-border-secondary"
        aria-hidden
      />

      <div className="flex w-full min-w-0 items-center gap-2.5">
        {iconSrc ? (
          <img
            src={iconSrc}
            alt=""
            width={24}
            height={24}
            className="size-6 shrink-0 object-contain"
          />
        ) : Icon ? (
          <Icon className="size-6 shrink-0 text-foreground" />
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col justify-center">
          {isReadonly ? (
            <p className="m-0 min-w-0 truncate text-sm leading-5 text-foreground">
              {displayUrl || '—'}
            </p>
          ) : (
            <Input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder={t(placeholderKey)}
              className={cn(
                'h-auto min-w-0 rounded-none border-0 bg-transparent p-0 shadow-none',
                'text-sm leading-5 text-foreground placeholder:text-muted-foreground',
                'focus-visible:ring-0',
              )}
            />
          )}
        </div>

        {isRejected ? (
          <div
            className={cn(
              // <md 取消定位上下文，气泡相对整行卡片；md+ 仍锚定按钮
              'group static shrink-0 md:relative',
            )}
          >
            <button
              type="button"
              onClick={handleRejectionReasonClick}
              onBlur={() => setIsRejectionTooltipOpen(false)}
              className={cn(
                'inline-flex items-center gap-1 rounded px-2 py-1',
                'bg-destructive/14 text-xs leading-4 tracking-[0.04px] text-destructive',
                'outline-none focus-visible:ring-2 focus-visible:ring-ring',
              )}
            >
              <span>{t('未通过')}</span>
              <IconHelpCircle className="size-4 shrink-0 text-destructive" />
            </button>

            {rejectionReason ? (
              <div
                role="tooltip"
                className={cn(
                  // Layout & Positioning — <md 相对整行左右拉满，避免贴按钮向左溢出被裁切
                  'invisible absolute inset-x-0 bottom-full z-20 mb-2 w-auto min-w-0 max-w-none',
                  'md:inset-x-auto md:right-0 md:left-auto md:w-max md:min-w-48 md:max-w-[min(401px,calc(100vw-2rem))]',
                  // Visuals & Typography
                  'rounded-xl bg-card p-4',
                  'text-xs leading-4 tracking-[0.04px] break-words whitespace-normal text-destructive opacity-0',
                  'shadow-[0px_12px_32px_-16px_rgba(0,0,51,0.06),0px_8px_40px_0px_rgba(0,0,0,0.05)]',
                  // Interactions & States
                  'pointer-events-none transition-opacity duration-150',
                  'group-hover:visible group-hover:opacity-100',
                  'group-focus-within:visible group-focus-within:opacity-100',
                  isRejectionTooltipOpen && 'visible opacity-100',
                )}
              >
                {t('未通过审核原因：')}
                {rejectionReason}
                <div
                  className={cn(
                    'pointer-events-none absolute top-full right-4 -mt-px',
                    'h-0 w-0 border-x-[7px] border-t-8 border-x-transparent border-t-card',
                  )}
                  aria-hidden
                />
              </div>
            ) : null}
          </div>
        ) : null}

        {isPending ? (
          <Button
            type="button"
            disabled
            variant="ghost"
            className={cn(
              'h-auto shrink-0 rounded border-[1.5px] border-button-disabled-foreground bg-transparent px-3 py-1.5',
              'text-sm leading-5 font-bold text-button-disabled-foreground',
              'hover:bg-transparent hover:text-button-disabled-foreground',
              'disabled:border-button-disabled-foreground disabled:bg-transparent disabled:text-button-disabled-foreground disabled:opacity-100',
            )}
          >
            {t('审核中')}
          </Button>
        ) : null}

        {isApproved ? (
          <Button
            type="button"
            disabled
            variant="outline"
            className={cn(
              'h-auto shrink-0 rounded border-[1.5px] border-story-checkin-accent bg-transparent px-3 py-1.5',
              'text-sm leading-5 font-bold text-story-checkin-accent',
              'opacity-60 disabled:border-story-checkin-accent disabled:text-story-checkin-accent disabled:opacity-60',
            )}
          >
            {t('已通过')}
          </Button>
        ) : null}

        {!isPending && !isApproved ? (
          <Button
            type="button"
            disabled={submitMutation.isPending}
            variant="outline"
            onClick={handleSubmit}
            className={cn(
              'h-auto shrink-0 rounded border-[1.5px] border-story-checkin-accent bg-transparent px-3 py-1.5',
              'text-sm leading-5 font-bold text-story-checkin-accent',
              'hover:bg-story-checkin-accent/5 hover:text-story-checkin-accent',
              'disabled:border-story-checkin-accent disabled:text-story-checkin-accent disabled:opacity-100',
            )}
          >
            <GameDialogSubmitLabel isPending={submitMutation.isPending}>
              {t('提交')}
            </GameDialogSubmitLabel>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
