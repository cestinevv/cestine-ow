import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import IconPlus from '@/assets/svg/IconPlus';
import { Button } from '@/components/ui/button';
import { DramaFlowThirdRoleAddCard } from '@/features/drama-flow/components/DramaFlowThirdRoleAddCard';
import {
  DRAMA_FLOW_MAX_ROLES,
  DRAMA_FLOW_ROLE_GRID_CLASS,
} from '@/features/drama-flow/constants/dramaFlowRoleGrid';
import { getActorBindDeadlineMs } from '@/features/drama-flow/utils/dramaActorBindWindow';
import { cn } from '@/utils';
import { formatDateFromMillisecond } from '@/utils/formatDate';

const IP_BIND_RULE_KEY =
  '每部短剧最多绑定 5 个角色 IP，上架 7 天内可新增，发布后不可解除或更换' as const;

const IP_BIND_EFFECT_RULE_KEY =
  '绑定后，角色IP将关联短剧的完播和热度数据，用于升级角色和产出STORY。' as const;

const IP_BIND_OPTIONAL_RULE_KEY = '绑定 IP 为选填，可不绑定直接发布。' as const;

/** 桌面规则列表（含选填说明） */
const DESKTOP_IP_RULE_KEYS = [
  IP_BIND_RULE_KEY,
  IP_BIND_EFFECT_RULE_KEY,
  IP_BIND_OPTIONAL_RULE_KEY,
] as const;

/** 移动端虚线提示区文案（Figma 1237:106413，不含选填句） */
const MOBILE_IP_RULE_KEYS = [
  IP_BIND_RULE_KEY,
  IP_BIND_EFFECT_RULE_KEY,
] as const;

function trimRuleTailPunctuation(text: string): string {
  return text.replace(/[。.]$/, '');
}

type DramaFlowThirdRolePanelProps = {
  children: ReactNode;
  boundCount: number;
  maxBindings?: number;
  onlineAt?: number;
  onOpenSelectDialog: () => void;
};

export function DramaFlowThirdRolePanel({
  children,
  boundCount,
  maxBindings = DRAMA_FLOW_MAX_ROLES,
  onlineAt,
  onOpenSelectDialog,
}: DramaFlowThirdRolePanelProps) {
  const { t } = useTranslation();
  const canAddBinding = boundCount < maxBindings;
  const actorBindDeadlineMs = getActorBindDeadlineMs(onlineAt);
  const actorBindDeadlineLabel =
    actorBindDeadlineMs !== undefined
      ? formatDateFromMillisecond(actorBindDeadlineMs)
      : undefined;

  const handleOpenSelectDialog = () => {
    onOpenSelectDialog();
  };

  function renderBindRuleLine(ruleKey: (typeof DESKTOP_IP_RULE_KEYS)[number]) {
    if (ruleKey === IP_BIND_RULE_KEY && actorBindDeadlineLabel) {
      return (
        <>
          {trimRuleTailPunctuation(t(IP_BIND_RULE_KEY))}
          {' · '}
          {t('截止')}{' '}
          <span className="font-bold text-success">
            {actorBindDeadlineLabel}
          </span>
        </>
      );
    }

    return trimRuleTailPunctuation(t(ruleKey));
  }

  return (
    <div className={cn('flex w-full flex-col', 'gap-4 md:gap-8')}>
      {/* 移动端：虚线规则区 + 紧凑「+」（Figma 1237:18553） */}
      <div
        className={cn(
          'flex w-full flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-muted p-4',
          'md:hidden',
        )}
      >
        <div
          className={cn(
            'flex w-full flex-col gap-4',
            'text-xs leading-4 font-normal tracking-[0.04px]',
            'text-muted-foreground',
          )}
        >
          {MOBILE_IP_RULE_KEYS.map((ruleKey) => (
            <p key={ruleKey} className="mb-0 whitespace-pre-wrap">
              {renderBindRuleLine(ruleKey)}
            </p>
          ))}
        </div>
        {canAddBinding ? (
          <Button
            type="button"
            variant="ghost"
            aria-label={t('选择角色 IP')}
            onClick={handleOpenSelectDialog}
            className={cn(
              // Figma 1140:127057：unavailable 底 + secondary 色「+」（非 on-surface 白/黑字）
              'h-auto shrink-0 rounded-xl px-8 py-2.5',
              'bg-button-disabled-surface text-muted-foreground',
              'hover:bg-button-disabled-surface/90 hover:text-muted-foreground',
            )}
          >
            <IconPlus className="size-5" />
          </Button>
        ) : null}
      </div>

      <div className={cn('w-full min-w-0', DRAMA_FLOW_ROLE_GRID_CLASS)}>
        {children}
        {canAddBinding ? (
          <DramaFlowThirdRoleAddCard
            className="max-md:hidden"
            onOpenSelectDialog={handleOpenSelectDialog}
          />
        ) : null}
      </div>

      {/* 桌面：网格下方规则列表 */}
      <ul
        className={cn(
          'hidden w-full list-disc flex-col',
          'gap-0 pl-5',
          'text-xs leading-4 font-normal tracking-[0.04px] text-muted-foreground',
          'md:flex',
        )}
      >
        {DESKTOP_IP_RULE_KEYS.map((ruleKey) => (
          <li key={ruleKey}>{renderBindRuleLine(ruleKey)}</li>
        ))}
      </ul>
    </div>
  );
}
