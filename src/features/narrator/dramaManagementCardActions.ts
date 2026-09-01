import { ListDramasStatus } from '@/api/__generated__/story/model/listDramasStatus';

export const CREATOR_DRAMA_STATUS = {
  ...ListDramasStatus,
  PENDING_ONLINE: 'PENDING_ONLINE',
} as const;

/** 短剧管理卡片 — 角标色板 */
export const DRAMA_STATUS_TEXT_CLASS = {
  passed: 'text-narrator-review-passed',
  pending: 'text-narrator-review-pending',
  rejected: 'text-narrator-review-rejected',
} as const;

export type DramaStatusBadgeTone = keyof typeof DRAMA_STATUS_TEXT_CLASS;

/** 后端生命周期枚举 → 角标文案 key + 色板口径。 */
export const DRAMA_STATUS_BADGE: Record<
  string,
  { labelKey: string; tone: DramaStatusBadgeTone }
> = {
  [CREATOR_DRAMA_STATUS.PENDING_REVIEW]: {
    labelKey: '审核中',
    tone: 'pending',
  },
  [CREATOR_DRAMA_STATUS.REVIEW_REJECTED]: {
    labelKey: '未通过',
    tone: 'rejected',
  },
  [CREATOR_DRAMA_STATUS.PENDING_ONLINE]: {
    labelKey: '已通过',
    tone: 'passed',
  },
  [CREATOR_DRAMA_STATUS.ONLINE]: { labelKey: '已通过', tone: 'passed' },
  [CREATOR_DRAMA_STATUS.OFFLINE]: { labelKey: '已下架', tone: 'rejected' },
};

export type DramaCardLeftAction = 'mint' | 'delete' | 'wait' | 'fallback';

export type DramaCardRightAction = 'delete' | 'edit';

export type DramaCardLeftButton = {
  labelKey: string;
  disabled: boolean;
  action: DramaCardLeftAction;
};

export type DramaCardRightButton = {
  labelKey: string;
  action: DramaCardRightAction;
};

export type DramaCardActionsConfig = {
  badge: { labelKey: string; tone: DramaStatusBadgeTone };
  footnoteKey: string;
  left: DramaCardLeftButton;
  right: DramaCardRightButton | null;
  /** 无稿面双按钮时的占位文案 key（如已下架 / 暂不可操作） */
  fallbackLabelKey?: string;
};

export type DramaStatusReasonDialogConfig = {
  titleKey: string;
  reasonTitleKey: string;
  reasonDescription?: string;
};

export function isDramaStatusPendingReview(status: string): boolean {
  return status === CREATOR_DRAMA_STATUS.PENDING_REVIEW;
}

export function getDramaStatusReasonDialogConfig(
  status: string,
  auditReason?: string,
): DramaStatusReasonDialogConfig | null {
  if (status === CREATOR_DRAMA_STATUS.OFFLINE) {
    return {
      titleKey: '已下架',
      reasonTitleKey: auditReason ?? '',
    };
  }

  if (status === CREATOR_DRAMA_STATUS.REVIEW_REJECTED) {
    return {
      titleKey: '未通过',
      reasonTitleKey: '其它原因',
      reasonDescription: auditReason,
    };
  }

  return null;
}

/** 编辑入口：仅审核通过 / 审核未通过展示（Figma 4657:22820）。 */
export function canShowDramaCardEdit(status: string): boolean {
  return (
    status === CREATOR_DRAMA_STATUS.ONLINE ||
    status === CREATOR_DRAMA_STATUS.REVIEW_REJECTED
  );
}

/** 底部说明：按生命周期给出口径文案 key。 */
function footnoteKeyForLifecycle(status: string): string {
  if (
    status === CREATOR_DRAMA_STATUS.PENDING_REVIEW ||
    status === CREATOR_DRAMA_STATUS.REVIEW_REJECTED
  ) {
    return '审核通过后可铸造短剧NFT并上架短剧';
  }

  if (status === CREATOR_DRAMA_STATUS.PENDING_ONLINE) {
    return '等待链上确认后可完成上架';
  }

  if (status === CREATOR_DRAMA_STATUS.ONLINE) {
    return '铸造NFT后自动上架短剧';
  }

  return '铸造NFT后自动上架短剧';
}

/** 按短剧生命周期返回卡片按钮与角标配置（Figma 4657:22820）。 */
export function getDramaCardActionsConfig(
  statusRaw?: string,
): DramaCardActionsConfig {
  const status = statusRaw?.trim() ?? '';
  const badge = DRAMA_STATUS_BADGE[status] ?? {
    labelKey: '未知状态',
    tone: 'pending' as const,
  };
  const footnoteKey = footnoteKeyForLifecycle(status);

  if (status === CREATOR_DRAMA_STATUS.PENDING_REVIEW) {
    return {
      badge,
      footnoteKey,
      left: { labelKey: '等待审核', disabled: true, action: 'wait' },
      right: { labelKey: '删除', action: 'delete' },
    };
  }

  if (status === CREATOR_DRAMA_STATUS.ONLINE) {
    return {
      badge,
      footnoteKey,
      left: { labelKey: '铸造短剧NFT', disabled: false, action: 'mint' },
      right: { labelKey: '编辑', action: 'edit' },
    };
  }

  if (status === CREATOR_DRAMA_STATUS.PENDING_ONLINE) {
    return {
      badge,
      footnoteKey,
      left: { labelKey: '铸造短剧NFT', disabled: false, action: 'mint' },
      right: null,
    };
  }

  if (status === CREATOR_DRAMA_STATUS.REVIEW_REJECTED) {
    return {
      badge,
      footnoteKey,
      left: { labelKey: '删除短剧', disabled: false, action: 'delete' },
      right: { labelKey: '编辑', action: 'edit' },
    };
  }

  const fallbackLabelKey =
    status === CREATOR_DRAMA_STATUS.OFFLINE ? '已下架' : '暂不可操作';

  return {
    badge,
    footnoteKey,
    left: { labelKey: fallbackLabelKey, disabled: true, action: 'fallback' },
    right: null,
    fallbackLabelKey,
  };
}
