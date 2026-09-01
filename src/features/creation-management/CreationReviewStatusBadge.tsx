import { type MouseEvent, type PointerEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';

import IconHelpCircle from '@/assets/svg/IconHelpCircle';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/utils';

export type CreationReviewBadge = {
  labelKey: string;
  className: string;
  showHelp?: boolean;
};

export function getCreationReviewBadge(
  status: string | undefined,
): CreationReviewBadge {
  if (status === 'ONLINE') {
    return { labelKey: '已通过', className: 'bg-success text-white' };
  }
  if (status === 'PENDING_REVIEW') {
    return {
      labelKey: '审核中',
      className: 'bg-[#3e63dd]/80 text-white',
    };
  }
  if (status === 'REVIEW_REJECTED') {
    return {
      labelKey: '未通过',
      className: 'bg-destructive text-white',
      showHelp: true,
    };
  }
  if (status === 'OFFLINE') {
    return {
      labelKey: '已下架',
      // Figma 557:87110：unavailable 灰底 + 问号
      className: 'bg-button-disabled-surface text-white',
      showHelp: true,
    };
  }

  return {
    labelKey: '待提交',
    className: 'bg-button-disabled-surface text-white',
  };
}

function resolveReviewHelpText(
  labelKey: string,
  auditReason: string | undefined,
  t: (key: string) => string,
) {
  const reason = auditReason?.trim();

  if (labelKey === '未通过') {
    if (reason) {
      return `${t('未通过审核原因：')}${reason}`;
    }

    return t('审核未通过，请编辑后重新提交');
  }

  if (labelKey === '已下架') {
    if (reason) {
      return reason;
    }

    return t('暂无下架原因');
  }

  return reason || t('审核说明');
}

export function CreationReviewStatusBadge({
  badge,
  auditReason,
}: {
  badge: CreationReviewBadge;
  /** 审核驳回 / 下架原因，优先展示接口 `auditReason` */
  auditReason?: string;
}) {
  const { t } = useTranslation();
  const [helpOpen, setHelpOpen] = useState(false);
  const helpText = resolveReviewHelpText(badge.labelKey, auditReason, t);

  function handleHelpPointerDown(event: PointerEvent<HTMLButtonElement>) {
    // 阻止冒泡到封面播放层，同时支持触控点击展开
    event.preventDefault();
    event.stopPropagation();
  }

  function handleHelpClick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    setHelpOpen((open) => !open);
  }

  return (
    <span
      className={cn(
        // Layout — Figma 557:87110：左上角状态标；需可点，盖住封面播放层
        // z-2 仅相对封面叠层；勿用 z-30，否则上滑会盖过吸顶 Tab / 顶栏
        'pointer-events-auto absolute top-0 left-0 z-2 inline-flex items-center gap-1',
        // Spacing / Visual
        'rounded-tl-[10px] rounded-br-[10px] py-1 pr-1.5 pl-2',
        'text-xs leading-4 font-medium tracking-[0.04px]',
        badge.className,
      )}
    >
      {t(badge.labelKey)}
      {badge.showHelp ? (
        <Tooltip open={helpOpen} onOpenChange={setHelpOpen}>
          <TooltipTrigger
            render={
              <button
                type="button"
                className="inline-flex appearance-none items-center border-0 bg-transparent p-0 text-white"
                aria-label={t('审核说明')}
                aria-expanded={helpOpen}
                onPointerDown={handleHelpPointerDown}
                onClick={handleHelpClick}
              />
            }
          >
            <IconHelpCircle className="size-4 shrink-0" />
          </TooltipTrigger>
          <TooltipContent
            side="bottom"
            align="start"
            className="max-w-56 wrap-anywhere text-xs leading-4"
          >
            {helpText}
          </TooltipContent>
        </Tooltip>
      ) : null}
    </span>
  );
}
