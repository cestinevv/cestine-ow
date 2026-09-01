import { useNavigate } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { BoundActorCollectionResponse } from '@/api/__generated__/story/model/boundActorCollectionResponse';
import type { DramaDetailResponse } from '@/api/__generated__/story/model/dramaDetailResponse';
import coverImage from '@/assets/image/index/showcase-still-01.png';
import IconHelpCircle from '@/assets/svg/IconHelpCircle';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { PLAY_CARD_COVER_ASPECT_CLASS } from '@/features/play/playFormat';
import { cn } from '@/utils';
import { readSnowflakeId } from '@/utils/snowflakeId';

import { NARRATOR_CARD_BUTTON_CLASS } from '../constants/narratorCardButton';
import {
  canShowDramaCardEdit,
  DRAMA_STATUS_TEXT_CLASS,
  getDramaCardActionsConfig,
  getDramaStatusReasonDialogConfig,
  isDramaStatusPendingReview,
} from '../dramaManagementCardActions';

type DramaManagementCardProps = {
  drama: DramaDetailResponse;
  mintDisabled?: boolean;
  deleteDisabled?: boolean;
  onMint?: () => void;
  onDelete?: () => void;
};

const FALLBACK_DRAMA_DESCRIPTION =
  '加密货币市场的至暗时刻。一场价值数百亿美元的清算风暴，交易员、投资者与平台的生死博弈。';

function getBoundActorKey(actor: BoundActorCollectionResponse): string {
  return (
    readSnowflakeId(actor.actorCollectionId) ||
    actor.assetId?.trim() ||
    actor.name?.trim() ||
    ''
  );
}

function getBoundActorName(actor: BoundActorCollectionResponse): string {
  return actor.name?.trim() || readSnowflakeId(actor.actorCollectionId) || '-';
}

export function DramaManagementCard({
  drama,
  mintDisabled = false,
  deleteDisabled = false,
  onMint,
  onDelete,
}: DramaManagementCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isStatusReasonOpen, setIsStatusReasonOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isMoreMenuOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (moreMenuRef.current?.contains(target)) {
        return;
      }

      setIsMoreMenuOpen(false);
    }

    document.addEventListener('pointerdown', handlePointerDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isMoreMenuOpen]);

  const status = drama.status?.trim() ?? '';
  const isPendingReview = isDramaStatusPendingReview(status);
  const config = getDramaCardActionsConfig(status);
  const { badge, left, right } = config;
  const isNftMinted = drama.nftMinted === true;
  const editDisabled = drama.id === undefined || isPendingReview;
  const effectiveRight =
    isNftMinted && canShowDramaCardEdit(status)
      ? ({ labelKey: '编辑', action: 'edit' } as const)
      : right;
  const auditReason = drama.auditReason?.trim();
  const statusReasonDialogConfig = getDramaStatusReasonDialogConfig(
    status,
    auditReason,
  );
  const showStatusHelpIcon = statusReasonDialogConfig !== null;

  const episodes = drama.totalEpisodes;
  const episodeText =
    episodes !== undefined
      ? t('{{count}} 集', { count: episodes })
      : t('33 集');
  const descriptionText =
    drama.description?.trim() || FALLBACK_DRAMA_DESCRIPTION;
  const coverSrc = drama.coverUrl?.trim() || coverImage;
  const titleText = drama.title?.trim() || '-';
  const boundActorCollections =
    drama.boundActorCollections?.filter((actor) => getBoundActorKey(actor)) ??
    [];
  const dramaTags =
    drama.tags?.map((tag) => tag.trim()).filter((tag) => tag.length > 0) ?? [];

  // 左键点击：铸造或删除（等待审核 / 占位态无交互）
  const handleLeftClick = () => {
    if (left.disabled || left.action === 'wait' || left.action === 'fallback') {
      return;
    }

    if (left.action === 'mint') {
      onMint?.();
      return;
    }

    if (left.action === 'delete') {
      onDelete?.();
    }
  };

  // 右键点击：编辑或删除
  const handleRightClick = () => {
    if (!effectiveRight || editDisabled) {
      return;
    }

    if (effectiveRight.action === 'edit') {
      const dramaIdText = readSnowflakeId(drama.id);
      if (dramaIdText) {
        void navigate({ to: '/edit', search: { dramaId: dramaIdText } });
      }
      return;
    }

    if (effectiveRight.action === 'delete') {
      onDelete?.();
    }
  };

  const leftButtonDisabled =
    left.disabled ||
    left.action === 'wait' ||
    left.action === 'fallback' ||
    (left.action === 'mint' && mintDisabled) ||
    (left.action === 'delete' && deleteDisabled);

  const canDelete = !!onDelete;
  const shouldRenderMintedLeftButton = isNftMinted && !isPendingReview;
  const shouldRenderLeftButton =
    left.action !== 'delete' &&
    (left.action === 'wait' || !shouldRenderMintedLeftButton);
  const shouldRenderRightButton = effectiveRight?.action === 'edit';

  function handleAuditReasonClick() {
    if (!showStatusHelpIcon) {
      return;
    }

    setIsStatusReasonOpen(true);
  }

  function handleDeleteClick() {
    if (deleteDisabled) {
      return;
    }

    onDelete?.();
    setIsMoreMenuOpen(false);
  }

  function handleMoreMenuToggle() {
    setIsMoreMenuOpen((open) => !open);
  }

  return (
    <article
      className={cn(
        'relative flex h-full min-h-0 min-w-0 flex-col overflow-visible',
        'rounded-xl bg-card',
        'index-shadow-pipeline-hover',
      )}
    >
      <div
        className={cn(
          'relative w-full shrink-0 overflow-hidden rounded-t-xl',
          PLAY_CARD_COVER_ASPECT_CLASS,
        )}
      >
        <img
          src={coverSrc}
          alt={drama.title?.trim() ? drama.title : t('短剧封面')}
          className="h-full w-full object-cover"
        />

        {isNftMinted ? (
          <span
            className={cn(
              'absolute bottom-4 left-4 z-10',
              'inline-flex items-center rounded-full bg-white/80',
              'px-2 py-1',
              'text-xs leading-4 font-medium',
              DRAMA_STATUS_TEXT_CLASS.passed,
            )}
          >
            {t('已铸造')}
          </span>
        ) : null}
      </div>

      <div
        className={cn(
          'pointer-events-none absolute top-4 left-4 right-4 z-10',
          'flex items-start justify-between gap-3',
        )}
      >
        {showStatusHelpIcon ? (
          <div className="pointer-events-auto relative">
            <button
              type="button"
              onClick={handleAuditReasonClick}
              className={cn(
                'inline-flex items-center rounded-full bg-white/80',
                'gap-1 px-2 py-1',
                'text-xs leading-4 font-medium',
                'outline-none focus-visible:ring-2 focus-visible:ring-ring',
                DRAMA_STATUS_TEXT_CLASS[badge.tone],
              )}
            >
              <span>{t(badge.labelKey)}</span>

              <IconHelpCircle
                aria-hidden
                className={cn(
                  'size-4 shrink-0',
                  DRAMA_STATUS_TEXT_CLASS[badge.tone],
                )}
              />
            </button>
          </div>
        ) : (
          <span
            className={cn(
              'pointer-events-auto inline-flex items-center rounded-full bg-white/80',
              'px-2 py-1',
              'text-xs leading-4 font-medium',
              DRAMA_STATUS_TEXT_CLASS[badge.tone],
            )}
          >
            {t(badge.labelKey)}
          </span>
        )}

        {canDelete ? (
          <div
            ref={moreMenuRef}
            className="pointer-events-auto relative ml-auto flex flex-col items-end gap-2"
          >
            <button
              type="button"
              onClick={handleMoreMenuToggle}
              aria-expanded={isMoreMenuOpen}
              aria-haspopup="menu"
              className={cn(
                'inline-flex h-6 items-center justify-center rounded-full bg-black/50',
                'px-2 text-white',
                'outline-none transition-colors hover:bg-black/60 focus-visible:ring-2 focus-visible:ring-ring',
              )}
              aria-label={t('更多操作')}
            >
              <EllipsisIcon className="size-4" />
            </button>
            <div
              role="menu"
              className={cn(
                'absolute top-full right-0 z-30 mt-2',
                'rounded-xl bg-card px-8 py-3',
                'shadow-[0px_12px_32px_-16px_rgba(0,0,51,0.06),0px_8px_40px_0px_rgba(0,0,0,0.05)]',
                'transition-opacity duration-150',
                isMoreMenuOpen
                  ? 'visible opacity-100'
                  : 'invisible opacity-0 pointer-events-none',
              )}
            >
              <button
                type="button"
                onClick={handleDeleteClick}
                disabled={deleteDisabled}
                className="text-sm leading-5 font-bold whitespace-nowrap text-destructive outline-none disabled:opacity-50"
              >
                {t('删除')}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className={cn('flex min-h-0 min-w-0 flex-1 flex-col gap-4', 'p-4')}>
        <div className="flex min-w-0 flex-col gap-3">
          <h3
            className="truncate text-base leading-6 font-bold text-foreground"
            title={titleText}
          >
            {titleText}
          </h3>

          {dramaTags.length > 0 ? (
            <div className="flex min-w-0 flex-nowrap items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {dramaTags.map((tag) => (
                <span
                  key={tag}
                  className="shrink-0 rounded bg-muted px-2 py-1 text-xs leading-4 tracking-[0.04px] whitespace-nowrap text-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}

          <p className="w-full truncate text-sm leading-5 tracking-[-0.1504px] text-muted-foreground">
            {episodeText} ｜ {descriptionText}
          </p>
        </div>

        {boundActorCollections.length > 0 ? (
          <div className="flex w-full min-w-0 items-center gap-1.5 overflow-hidden">
            {boundActorCollections.map((actor) => {
              const actorName = getBoundActorName(actor);
              const avatarUrl = actor.avatarUrl?.trim();

              return avatarUrl ? (
                <img
                  key={getBoundActorKey(actor)}
                  src={avatarUrl}
                  alt=""
                  className="size-6 shrink-0 rounded-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <span
                  key={getBoundActorKey(actor)}
                  aria-hidden
                  className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs leading-4 text-muted-foreground"
                >
                  {actorName.slice(0, 1)}
                </span>
              );
            })}
          </div>
        ) : null}

        <div className="mt-auto w-full shrink-0">
          {shouldRenderMintedLeftButton && shouldRenderRightButton ? (
            <div className="flex w-full items-center gap-3">
              <Button
                type="button"
                variant="outline"
                disabled
                className={cn(
                  NARRATOR_CARD_BUTTON_CLASS,
                  'min-w-0 flex-1 px-4',
                )}
              >
                {t('已铸造')}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={editDisabled}
                onClick={handleRightClick}
                className={cn(
                  NARRATOR_CARD_BUTTON_CLASS,
                  'shrink-0 px-6 enabled:text-foreground',
                )}
              >
                {t(effectiveRight?.labelKey ?? '')}
              </Button>
            </div>
          ) : shouldRenderLeftButton && shouldRenderRightButton ? (
            <div className="flex w-full items-center gap-3">
              <Button
                type="button"
                variant="outline"
                disabled={leftButtonDisabled}
                onClick={handleLeftClick}
                className={cn(
                  NARRATOR_CARD_BUTTON_CLASS,
                  'min-w-0 flex-1 px-4 enabled:text-foreground',
                )}
              >
                {t(left.labelKey)}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={editDisabled}
                onClick={handleRightClick}
                className={cn(
                  NARRATOR_CARD_BUTTON_CLASS,
                  'shrink-0 px-6 enabled:text-foreground',
                )}
              >
                {t(effectiveRight?.labelKey ?? '')}
              </Button>
            </div>
          ) : shouldRenderRightButton ? (
            <Button
              type="button"
              variant="outline"
              disabled={editDisabled}
              onClick={handleRightClick}
              className={cn(
                NARRATOR_CARD_BUTTON_CLASS,
                'w-full px-4 enabled:text-foreground',
              )}
            >
              {t(effectiveRight?.labelKey ?? '')}
            </Button>
          ) : shouldRenderLeftButton ? (
            <Button
              type="button"
              variant="outline"
              disabled={leftButtonDisabled}
              onClick={handleLeftClick}
              className={cn(
                NARRATOR_CARD_BUTTON_CLASS,
                'w-full px-4',
                left.action === 'fallback'
                  ? cn(
                      'h-auto rounded-full py-2.5',
                      'text-sm font-medium',
                      'bg-muted',
                    )
                  : 'enabled:text-foreground',
              )}
            >
              {t(left.labelKey)}
            </Button>
          ) : null}
        </div>
      </div>

      <DramaStatusReasonDialog
        open={isStatusReasonOpen}
        onOpenChange={setIsStatusReasonOpen}
        title={statusReasonDialogConfig?.titleKey ?? ''}
        reasonTitle={statusReasonDialogConfig?.reasonTitleKey ?? ''}
        reasonDescription={statusReasonDialogConfig?.reasonDescription}
      />
    </article>
  );
}

function DramaStatusReasonDialog({
  open,
  onOpenChange,
  title,
  reasonTitle,
  reasonDescription,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  reasonTitle: string;
  reasonDescription?: string;
}) {
  const { t } = useTranslation();
  const hasReasonContent = Boolean(reasonTitle || reasonDescription);

  function handleClose() {
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'w-full gap-0 border-0 bg-background p-6',
          'md:max-w-[400px]',
        )}
      >
        <div className="flex w-full flex-col items-center gap-6">
          <DialogTitle className="w-full text-center text-lg leading-[26px] font-bold tracking-[-0.04px] text-foreground">
            {t(title)}
          </DialogTitle>

          {hasReasonContent ? (
            <div className="flex w-full items-center justify-center rounded-lg bg-muted px-4 py-3">
              <div className="flex min-w-0 flex-1 flex-col items-start justify-center gap-1">
                {reasonTitle ? (
                  <p className="w-full text-sm leading-5 font-bold text-foreground">
                    {t(reasonTitle)}
                  </p>
                ) : null}
                {reasonDescription ? (
                  <p className="w-full text-[10px] leading-3 tracking-[0.08px] text-muted-foreground">
                    {reasonDescription}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            className="h-11 w-full rounded-xl text-sm leading-5 font-bold text-foreground"
          >
            {t('关闭')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EllipsisIcon({ className }: { className?: string }) {
  const { t } = useTranslation();

  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <title>{t('更多操作')}</title>
      <circle cx="3.5" cy="8" r="1" fill="currentColor" />
      <circle cx="8" cy="8" r="1" fill="currentColor" />
      <circle cx="12.5" cy="8" r="1" fill="currentColor" />
    </svg>
  );
}
