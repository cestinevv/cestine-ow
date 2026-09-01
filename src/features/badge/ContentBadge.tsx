import { useTranslation } from 'react-i18next';

import { cn } from '@/utils';

type ContentBadgeValue = 'OFFICIAL' | 'COMMUNITY' | 'PARTNER' | 'VERIFIED';

/** `issue`：演员发行徽章；`drama`：短剧徽章（文案为「xx短剧」） */
export type ContentBadgeVariant = 'issue' | 'drama';
export type ContentBadgeShape = 'pill' | 'corner';

type ContentBadgeProps = {
  badge?: string;
  variant?: ContentBadgeVariant;
  shape?: ContentBadgeShape;
  className?: string;
};

type BadgePresentation = {
  issueLabel: string;
  dramaLabel: string;
  surfaceClassName: string;
};

/** 浅色模式黑底白字，深色模式白底黑字（CSS 变量随主题自动切换） */
const BADGE_SURFACE_CLASS = 'bg-foreground text-background';

/** Figma 521:72807 官方标签 */
const BADGE_PRESENTATIONS: Record<ContentBadgeValue, BadgePresentation> = {
  OFFICIAL: {
    issueLabel: '官方发行',
    dramaLabel: '官方短剧',
    surfaceClassName: BADGE_SURFACE_CLASS,
  },
  COMMUNITY: {
    issueLabel: '社区发行',
    dramaLabel: '社区短剧',
    surfaceClassName: BADGE_SURFACE_CLASS,
  },
  PARTNER: {
    issueLabel: '合作方发行',
    dramaLabel: '合作方短剧',
    surfaceClassName: BADGE_SURFACE_CLASS,
  },
  VERIFIED: {
    issueLabel: '认证创作者发行',
    dramaLabel: '认证创作者短剧',
    surfaceClassName: BADGE_SURFACE_CLASS,
  },
};

/** 0821 临时关闭内容角标；恢复展示时改为 true */
const ENABLE_CONTENT_BADGE = false;

function isContentBadgeValue(value: string): value is ContentBadgeValue {
  return value in BADGE_PRESENTATIONS;
}

export function ContentBadge({
  badge,
  variant = 'issue',
  shape = 'pill',
  className,
}: ContentBadgeProps) {
  const { t } = useTranslation();

  if (!ENABLE_CONTENT_BADGE || !badge || !isContentBadgeValue(badge)) {
    return null;
  }

  const presentation = BADGE_PRESENTATIONS[badge];
  const label =
    variant === 'drama' ? presentation.dramaLabel : presentation.issueLabel;
  const isCorner = shape === 'corner';

  return (
    <span
      className={cn(
        'inline-flex w-fit max-w-full shrink-0 items-center self-start',
        'px-1.5 py-1 font-normal whitespace-nowrap',
        isCorner
          ? 'text-[11px] leading-3 tracking-[0.08px]'
          : 'text-xs leading-4 tracking-[0.04px]',
        isCorner ? 'rounded-tl-[10px] rounded-br-[10px]' : 'rounded',
        presentation.surfaceClassName,
        className,
      )}
    >
      <span className="truncate">{t(label)}</span>
    </span>
  );
}
