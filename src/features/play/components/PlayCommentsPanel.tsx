import emojiData from '@emoji-mart/data';
import {
  type InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useTheme } from 'next-themes';
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useInView } from 'react-intersection-observer';
import { toast } from 'sonner';

import type { CommentResponse } from '@/api/__generated__/story/model/commentResponse';
import { CommentResponseTagsItem } from '@/api/__generated__/story/model/commentResponseTagsItem';
import type { PageDtoCommentResponse } from '@/api/__generated__/story/model/pageDtoCommentResponse';
import IconAlertTriangle from '@/assets/svg/IconAlertTriangle';
import IconChevronDown from '@/assets/svg/IconChevronDown';
import IconChevronUp from '@/assets/svg/IconChevronUp';
import IconCommentLikeFilled from '@/assets/svg/IconCommentLikeFilled';
import IconCommentLikeOutline from '@/assets/svg/IconCommentLikeOutline';
import IconCommentMessage from '@/assets/svg/IconCommentMessage';
import IconCommentMore from '@/assets/svg/IconCommentMore';
import IconCommentSendArrow from '@/assets/svg/IconCommentSendArrow';
import IconMoodSmile from '@/assets/svg/IconMoodSmile';
import IconNoData from '@/assets/svg/IconNoData';
import IconTrash from '@/assets/svg/IconTrash';
import { UserProfileAvatarCircle } from '@/components/common/UserProfileAvatar';
import { UserProfileAvatarLink } from '@/components/common/UserProfileAvatarLink';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { usePlayRequireLogin } from '@/features/play/hooks/usePlayRequireLogin';
import {
  deletePlayComment,
  getPlayComment,
  getPlayCommentQueryKey,
  getPlayCommentRepliesQueryKey,
  getPlayListCommentsQueryKey,
  getPlayMediaDetailQueryKey,
  isPlayCommentNotFoundError,
  listPlayCommentReplies,
  listPlayComments,
  postPlayComment,
  postPlayCommentReply,
  togglePlayLikeComment,
} from '@/features/play/playDramaApi';
import {
  getPlayCursorNextPageParam,
  getRoleAvatarFallback,
  unwrapOrvalPayload,
} from '@/features/play/playFormat';
import { useProfileBlockInteractionGuard } from '@/features/profile/useProfileBlockInteractionGuard';
import {
  UgcReportDialog,
  type UgcReportFormValue,
} from '@/features/ugc/components/UgcReportDialog';
import {
  fetchUgcReportTypes,
  getUgcReportTypesQueryKey,
  mapUgcReportReasonOptions,
  requestUgcReportComment,
} from '@/features/ugc/ugcReportApi';
import useGlobalStore from '@/stores/global';
import { cn, formatNumber, readSnowflakeId } from '@/utils';
import { formatDateFromNowMillisecond } from '@/utils/formatDate';

const COMMENT_PAGE_SIZE = 20;
const COMMENT_MAX_LENGTH = 200;
const COMMENT_MIN_LENGTH = 1;
const REPLY_FIRST_BATCH = 3;
const REPLY_MORE_BATCH = 10;
const TARGET_REPLY_PAGE_SIZE = 20;
const TARGET_COMMENT_HIGHLIGHT_MS = 5_000;

/** 评论点赞数：接口可能为 string，算术前须归一化为有限 number */
function readCommentLikeCount(
  value: number | string | null | undefined,
): number | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  const parsed = Number(String(value).trim());
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** emoji-mart 动态导入（按需加载，减少主 bundle 体积） */
const EmojiPicker = lazy(() =>
  import('@emoji-mart/react').then((mod) => ({ default: mod.default })),
);

/** 将任意 CSS 颜色解析为 emoji-mart 所需的 `r, g, b` 三元组 */
function cssColorToRgbTriplet(color: string): string | undefined {
  if (typeof document === 'undefined') {
    return undefined;
  }

  const probe = document.createElement('span');
  probe.style.color = color;
  document.body.appendChild(probe);
  const computed = getComputedStyle(probe).color;
  document.body.removeChild(probe);
  const match = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(computed);

  if (!match) {
    return undefined;
  }

  return `${match[1]}, ${match[2]}, ${match[3]}`;
}

/** 读取文档根上的主题 CSS 变量并转为 RGB 三元组 */
function readThemeRgbTriplet(cssVarName: string): string | undefined {
  if (typeof document === 'undefined') {
    return undefined;
  }

  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(cssVarName)
    .trim();

  if (!raw) {
    return undefined;
  }

  return cssColorToRgbTriplet(raw);
}

type PlayCommentsPanelProps = {
  dramaId: string;
  currentEpisode: number;
  episodeApiId: string;
  /** 短视频走短视频详情缓存，短剧走分集详情缓存 */
  contentType?: string;
  /** 全部评论数（来自媒体详情） */
  commentCount?: number;
  creatorUserId?: string;
  enabled?: boolean;
  targetCommentId?: string;
};

type ReplyTarget = {
  commentId: string;
  rootId: string;
  nickname: string;
};

function mergeUniqueComments(
  items: Array<CommentResponse | undefined>,
): CommentResponse[] {
  const merged: CommentResponse[] = [];
  const seenIds = new Set<string>();

  for (const item of items) {
    const id = readSnowflakeId(item?.commentId);
    if (item && id && !seenIds.has(id)) {
      merged.push(item);
      seenIds.add(id);
    }
  }

  return merged;
}

/**
 * 本地临时插队回复：
 * - 回一级：仍置顶，方便在楼内第一条看到
 * - 回二级：插到被回复评论正下方，保证出现在最近视线内
 * - 二级锚点未加载：插到当前列表末尾，避免误跑到楼内顶部
 */
function insertReplyNearTarget(
  existing: CommentResponse[],
  created: CommentResponse,
  options: {
    rootId: string;
    /** 被回复评论 ID；回一级时等于 rootId */
    targetCommentId: string;
    /** 服务端回写的 parentId，作锚点兜底匹配 */
    parentId?: string;
  },
): CommentResponse[] {
  const createdId = readSnowflakeId(created.commentId);
  const withoutCreated = createdId
    ? existing.filter((item) => readSnowflakeId(item.commentId) !== createdId)
    : existing;

  // 回复一级评论：保持置顶
  if (options.targetCommentId === options.rootId) {
    return [created, ...withoutCreated];
  }

  const anchorIds = [options.targetCommentId, options.parentId].filter(
    (id): id is string => Boolean(id),
  );
  const anchorIndex = withoutCreated.findIndex((item) => {
    const id = readSnowflakeId(item.commentId);
    return id !== undefined && anchorIds.includes(id);
  });

  if (anchorIndex < 0) {
    return [...withoutCreated, created];
  }

  return [
    ...withoutCreated.slice(0, anchorIndex + 1),
    created,
    ...withoutCreated.slice(anchorIndex + 1),
  ];
}

/** 跟在昵称旁的身份标签 */
const IDENTITY_TAGS = new Set<CommentResponseTagsItem>([
  CommentResponseTagsItem.AUTHOR,
  CommentResponseTagsItem.ME,
  CommentResponseTagsItem.FRIEND,
  CommentResponseTagsItem.FAN,
]);

/** 跟在正文下的内容标签 */
const CONTENT_TAGS = new Set<CommentResponseTagsItem>([
  CommentResponseTagsItem.FIRST,
  CommentResponseTagsItem.AUTHOR_LIKED,
]);

const TAG_LABEL_KEYS: Record<CommentResponseTagsItem, string> = {
  [CommentResponseTagsItem.AUTHOR]: '作者',
  [CommentResponseTagsItem.ME]: '我',
  [CommentResponseTagsItem.FRIEND]: '好友',
  [CommentResponseTagsItem.FAN]: '粉丝',
  [CommentResponseTagsItem.FIRST]: '首评',
  [CommentResponseTagsItem.AUTHOR_LIKED]: '作者赞过',
};

function resolveDisplayTags(
  tags: CommentResponseTagsItem[] | undefined,
): CommentResponseTagsItem[] {
  if (!tags?.length) {
    return [];
  }

  // 作者与「我」互斥：有作者则不展示「我」
  const hasAuthor = tags.includes(CommentResponseTagsItem.AUTHOR);
  return tags.filter(
    (tag) => !(hasAuthor && tag === CommentResponseTagsItem.ME),
  );
}

function getTagClassName(tag: CommentResponseTagsItem): string {
  switch (tag) {
    case CommentResponseTagsItem.AUTHOR:
      // Figma 80:82864 — 主题红底白字
      return 'bg-watch-follow-primary text-white';
    case CommentResponseTagsItem.FIRST:
      // Figma 102:107881 — primary/red5% + primary 文案
      return 'bg-watch-follow-primary/5 text-watch-follow-primary';
    default:
      // Figma 粉丝/好友/我/作者赞过 — thirdly + border secondary
      return 'border-[0.5px] border-border bg-page-thirdly text-muted-foreground';
  }
}

function CommentTagChips({
  tags,
  placement,
}: {
  tags?: CommentResponseTagsItem[];
  placement: 'identity' | 'content';
}) {
  const { t } = useTranslation();
  const allowed = placement === 'identity' ? IDENTITY_TAGS : CONTENT_TAGS;
  const displayTags = resolveDisplayTags(tags).filter((tag) =>
    allowed.has(tag),
  );

  if (displayTags.length === 0) {
    return null;
  }

  return (
    <ul className={cn('flex list-none flex-wrap gap-1 p-0')}>
      {displayTags.map((tag) => (
        <li key={tag}>
          <span
            className={cn(
              // Layout — 短文案（如「我」「首评」）保底宽度，避免芯片过扁
              'inline-flex min-w-8 items-center justify-center rounded px-1 py-0.5',
              'text-[11px] leading-4 tracking-[0.04px]',
              getTagClassName(tag),
            )}
          >
            {t(TAG_LABEL_KEYS[tag])}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** 点赞成功后局部写回：liked / likeCount / tags（含作者赞过） */
function applyCommentEngagementPatch(
  current: CommentResponse,
  fresh: CommentResponse,
): CommentResponse {
  return {
    ...current,
    liked: fresh.liked ?? current.liked,
    likeCount:
      readCommentLikeCount(fresh.likeCount) ??
      readCommentLikeCount(current.likeCount),
    tags: fresh.tags ?? current.tags,
  };
}

function patchCommentInTree(
  item: CommentResponse,
  commentId: string,
  fresh: CommentResponse,
): CommentResponse {
  const id = readSnowflakeId(item.commentId);
  if (id === commentId) {
    return applyCommentEngagementPatch(item, fresh);
  }

  const featuredId = readSnowflakeId(item.featuredReply?.commentId);
  if (item.featuredReply && featuredId === commentId) {
    return {
      ...item,
      featuredReply: applyCommentEngagementPatch(item.featuredReply, fresh),
    };
  }

  return item;
}

function patchCommentInListPage(
  page: unknown,
  commentId: string,
  fresh: CommentResponse,
): unknown {
  if (!page || typeof page !== 'object') {
    return page;
  }

  const pageData = unwrapOrvalPayload<PageDtoCommentResponse>(
    page as { data?: unknown },
  );
  if (!pageData?.list?.length) {
    return page;
  }

  let changed = false;
  const nextList = pageData.list.map((item) => {
    const next = patchCommentInTree(item, commentId, fresh);
    if (next !== item) {
      changed = true;
    }
    return next;
  });

  if (!changed) {
    return page;
  }

  const response = page as {
    data?: { data?: PageDtoCommentResponse | null } & Record<string, unknown>;
  };
  const outerData = response.data;
  if (!outerData) {
    return page;
  }

  if (outerData.data !== undefined) {
    return {
      ...response,
      data: {
        ...outerData,
        data: {
          ...pageData,
          list: nextList,
        },
      },
    };
  }

  return {
    ...response,
    data: {
      ...pageData,
      list: nextList,
    },
  };
}

function patchCommentInInfinitePages(
  current: unknown,
  commentId: string,
  fresh: CommentResponse,
): unknown {
  if (!current || typeof current !== 'object' || !('pages' in current)) {
    return current;
  }

  const infinite = current as InfiniteData<unknown>;
  let changed = false;
  const nextPages = infinite.pages.map((page) => {
    const next = patchCommentInListPage(page, commentId, fresh);
    if (next !== page) {
      changed = true;
    }
    return next;
  });

  if (!changed) {
    return current;
  }

  return {
    ...infinite,
    pages: nextPages,
  };
}

function CommentThreadToggle({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: 'down' | 'up';
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onClick}
      className={cn(
        'inline-flex h-auto w-fit self-start items-center justify-start gap-2 px-0 py-0',
        'text-[13px] leading-[18px] text-muted-foreground',
        'hover:bg-transparent hover:text-foreground',
      )}
    >
      <span className="block h-px w-[22px] shrink-0 bg-border" aria-hidden />
      <span className="inline-flex items-center">
        {label}
        {icon === 'down' ? (
          <IconChevronDown className="size-4" />
        ) : (
          <IconChevronUp className="size-4" />
        )}
      </span>
    </Button>
  );
}

export function PlayCommentsPanel({
  dramaId,
  currentEpisode: _currentEpisode,
  episodeApiId,
  contentType,
  commentCount,
  creatorUserId,
  enabled = true,
  targetCommentId,
}: PlayCommentsPanelProps) {
  const { t } = useTranslation();
  const { resolvedTheme } = useTheme();
  const queryClient = useQueryClient();
  const { ref, inView } = useInView();
  const { isLogin, requireLogin } = usePlayRequireLogin();
  const currentUserId = useGlobalStore((state) =>
    readSnowflakeId(state.userProfile?.userId),
  );
  const { guardBlockedInteraction } =
    useProfileBlockInteractionGuard(creatorUserId);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiPanelRef = useRef<HTMLDivElement>(null);
  const listScrollRef = useRef<HTMLDivElement>(null);
  const composerFooterRef = useRef<HTMLElement>(null);
  const composerShellRef = useRef<HTMLDivElement>(null);
  const targetRootCommentRef = useRef<HTMLLIElement>(null);
  const targetReplyCommentRef = useRef<HTMLDivElement>(null);
  const [commentDraft, setCommentDraft] = useState('');
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const [emojiPickerCssVars, setEmojiPickerCssVars] = useState<
    React.CSSProperties | undefined
  >();
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);
  /** 点击回复时递增，用于重播底栏动效 */
  const [composerAttentionKey, setComposerAttentionKey] = useState(0);
  const [isComposerHighlighted, setIsComposerHighlighted] = useState(false);
  const [isComposerFocused, setIsComposerFocused] = useState(false);
  const [shouldScrollListToTop, setShouldScrollListToTop] = useState(false);
  const [expandedRootIds, setExpandedRootIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [replyPages, setReplyPages] = useState<
    Record<string, CommentResponse[]>
  >({});
  const [replyMarks, setReplyMarks] = useState<
    Record<string, string | undefined>
  >({});
  const [replyHasMore, setReplyHasMore] = useState<Record<string, boolean>>({});
  const [pendingInsertIds, setPendingInsertIds] = useState<string[]>([]);
  const [deletedCommentIds, setDeletedCommentIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [highlightedCommentId, setHighlightedCommentId] = useState<string>();
  /** 评论点赞即时反馈（对齐视频点赞 overlay，避免等 invalidate） */
  const [likeOverlays, setLikeOverlays] = useState<
    Record<string, { liked: boolean; likeCount?: number }>
  >({});
  const [pendingLikeCommentId, setPendingLikeCommentId] = useState<string>();
  const [reportOpen, setReportOpen] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [reportingCommentId, setReportingCommentId] = useState<string>();

  const commentsQueryKey = getPlayListCommentsQueryKey(dramaId, episodeApiId, {
    pageSize: COMMENT_PAGE_SIZE,
  });

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: commentsQueryKey,
    queryFn: ({ pageParam }) =>
      listPlayComments(dramaId, episodeApiId, {
        pageSize: COMMENT_PAGE_SIZE,
        mark: pageParam as string | undefined,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: getPlayCursorNextPageParam,
    enabled: enabled && episodeApiId.length > 0,
    retry: false,
    refetchOnMount: 'always',
  });

  const targetCommentQuery = useQuery({
    queryKey: getPlayCommentQueryKey(targetCommentId ?? ''),
    queryFn: () => getPlayComment(targetCommentId ?? ''),
    enabled: enabled && Boolean(targetCommentId),
    retry: false,
    staleTime: 60_000,
  });

  const targetComment = unwrapOrvalPayload<CommentResponse>(
    targetCommentQuery.data,
  );
  const targetRootId = readSnowflakeId(targetComment?.rootId);

  const targetRootQuery = useQuery({
    queryKey: getPlayCommentQueryKey(targetRootId ?? ''),
    queryFn: () => getPlayComment(targetRootId ?? ''),
    enabled: enabled && Boolean(targetRootId),
    retry: false,
    staleTime: 60_000,
  });

  const targetRootComment = unwrapOrvalPayload<CommentResponse>(
    targetRootQuery.data,
  );

  const {
    data: targetRepliesData,
    fetchNextPage: fetchNextTargetReplyPage,
    hasNextPage: hasNextTargetReplyPage,
    isFetchingNextPage: isFetchingNextTargetReplyPage,
    isLoading: isLoadingTargetReplies,
    isError: isTargetRepliesError,
  } = useInfiniteQuery({
    queryKey: [
      ...getPlayCommentRepliesQueryKey(targetRootId ?? ''),
      { pageSize: TARGET_REPLY_PAGE_SIZE, targetCommentId },
    ],
    queryFn: ({ pageParam }) =>
      listPlayCommentReplies(targetRootId ?? '', {
        pageSize: TARGET_REPLY_PAGE_SIZE,
        mark: pageParam as string | undefined,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: getPlayCursorNextPageParam,
    enabled: enabled && Boolean(targetRootId),
    retry: false,
    staleTime: 60_000,
  });

  const targetThreadReplies = useMemo(() => {
    const replies: CommentResponse[] = [];
    for (const page of targetRepliesData?.pages ?? []) {
      const pageData = unwrapOrvalPayload<PageDtoCommentResponse>(page);
      replies.push(...(pageData?.list ?? []));
    }
    return mergeUniqueComments(replies);
  }, [targetRepliesData?.pages]);

  const serverComments = useMemo(() => {
    if (!data?.pages?.length) {
      return [];
    }
    const out: CommentResponse[] = [];
    for (const page of data.pages) {
      const pageData = unwrapOrvalPayload<PageDtoCommentResponse>(page);
      for (const item of pageData?.list ?? []) {
        out.push(item);
      }
    }
    return out;
  }, [data?.pages]);

  const pinnedTargetComment = targetRootId
    ? (targetRootComment ??
      serverComments.find(
        (item) => readSnowflakeId(item.commentId) === targetRootId,
      ))
    : targetComment;
  const targetReplyId = readSnowflakeId(targetComment?.commentId);
  const isTargetReplyLocated = Boolean(
    targetRootId &&
      targetReplyId &&
      (readSnowflakeId(pinnedTargetComment?.featuredReply?.commentId) ===
        targetReplyId ||
        targetThreadReplies.some(
          (item) => readSnowflakeId(item.commentId) === targetReplyId,
        )),
  );
  const fallbackTargetReply =
    targetRootId &&
    targetComment &&
    !isTargetReplyLocated &&
    (isTargetRepliesError ||
      (targetRepliesData &&
        !hasNextTargetReplyPage &&
        !isFetchingNextTargetReplyPage))
      ? targetComment
      : undefined;
  const isLoadingTargetComment =
    targetCommentQuery.isLoading || targetRootQuery.isLoading;

  // 通知目标与会话内新发主评只调整展示顺序，不改服务端分页缓存
  const comments = useMemo(() => {
    const ordered: CommentResponse[] = [];
    const seenIds = new Set<string>();
    const targetId = readSnowflakeId(targetComment?.commentId);
    const pinnedTargetId = readSnowflakeId(pinnedTargetComment?.commentId);

    if (
      targetId === targetCommentId &&
      pinnedTargetComment &&
      pinnedTargetId &&
      !deletedCommentIds.has(pinnedTargetId)
    ) {
      ordered.push(pinnedTargetComment);
      seenIds.add(pinnedTargetId);
    }

    const commentsById = new Map<string, CommentResponse>();
    for (const item of serverComments) {
      const id = readSnowflakeId(item.commentId);
      if (id && !deletedCommentIds.has(id) && !commentsById.has(id)) {
        commentsById.set(id, item);
      }
    }

    for (const id of pendingInsertIds) {
      const item = commentsById.get(id);
      if (item && !seenIds.has(id)) {
        ordered.push(item);
        seenIds.add(id);
      }
    }

    for (const item of serverComments) {
      const id = readSnowflakeId(item.commentId);
      if (id && !deletedCommentIds.has(id) && !seenIds.has(id)) {
        ordered.push(item);
        seenIds.add(id);
      }
    }

    return ordered;
  }, [
    deletedCommentIds,
    pendingInsertIds,
    pinnedTargetComment,
    serverComments,
    targetComment,
    targetCommentId,
  ]);

  // 切集 / 切剧时清空回复态与输入草稿，避免带到下一集
  useEffect(() => {
    if (!dramaId && !episodeApiId) {
      return;
    }

    setReplyTarget(null);
    setCommentDraft('');
    setIsEmojiOpen(false);
    setLikeOverlays({});
    setPendingLikeCommentId(undefined);
    setIsComposerHighlighted(false);
  }, [dramaId, episodeApiId]);

  // 点击「回复」后短暂高亮底栏输入区
  useEffect(() => {
    if (composerAttentionKey === 0) {
      return;
    }

    setIsComposerHighlighted(true);
    const timerId = window.setTimeout(() => {
      setIsComposerHighlighted(false);
    }, 700);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [composerAttentionKey]);

  // 点击 emoji 面板外部时关闭
  useEffect(() => {
    if (!isEmojiOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        emojiPanelRef.current &&
        !emojiPanelRef.current.contains(e.target as Node)
      ) {
        setIsEmojiOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isEmojiOpen]);

  // emoji-mart 背景/文字跟随全局主题 token（--background / --foreground / --muted）
  useEffect(() => {
    if (!isEmojiOpen || !resolvedTheme) {
      setEmojiPickerCssVars(undefined);
      return;
    }

    const background = readThemeRgbTriplet('--background');
    const color = readThemeRgbTriplet('--foreground');
    const input =
      readThemeRgbTriplet('--muted') ?? readThemeRgbTriplet('--secondary');

    setEmojiPickerCssVars({
      ...(background ? { '--rgb-background': background } : null),
      ...(color ? { '--rgb-color': color } : null),
      ...(input ? { '--rgb-input': input } : null),
    } as React.CSSProperties);
  }, [isEmojiOpen, resolvedTheme]);

  // emoji-mart 为滚动条预留右侧空间时会清空右内边距，这里恢复与左侧一致的间距
  useEffect(() => {
    if (!isEmojiOpen || !emojiPanelRef.current) {
      return;
    }

    const panel = emojiPanelRef.current;
    const applyBalancedSpacing = () => {
      const picker = panel.querySelector('em-emoji-picker');
      const shadowRoot = picker?.shadowRoot;
      if (!shadowRoot || shadowRoot.querySelector('[data-balanced-spacing]')) {
        return Boolean(shadowRoot);
      }

      const style = document.createElement('style');
      style.dataset.balancedSpacing = '';
      style.textContent = '.scroll { padding-right: var(--padding); }';
      shadowRoot.appendChild(style);
      return true;
    };

    if (applyBalancedSpacing()) {
      return;
    }

    const observer = new MutationObserver(() => {
      if (applyBalancedSpacing()) {
        observer.disconnect();
      }
    });
    observer.observe(panel, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [isEmojiOpen]);

  useEffect(() => {
    if (
      !targetCommentQuery.isError ||
      isPlayCommentNotFoundError(targetCommentQuery.error)
    ) {
      return;
    }

    toast.error(t('加载失败'));
  }, [t, targetCommentQuery.error, targetCommentQuery.isError]);

  useEffect(() => {
    const resolvedTargetId = readSnowflakeId(targetComment?.commentId);
    const pinnedTargetId = readSnowflakeId(pinnedTargetComment?.commentId);
    const isTargetAnchorReady = targetRootId
      ? isTargetReplyLocated || Boolean(fallbackTargetReply)
      : Boolean(pinnedTargetId);
    if (
      !targetCommentId ||
      resolvedTargetId !== targetCommentId ||
      !pinnedTargetId ||
      !isTargetAnchorReady
    ) {
      setHighlightedCommentId(undefined);
      return;
    }

    setHighlightedCommentId(targetCommentId);
    const frameId = window.requestAnimationFrame(() => {
      const targetElement =
        targetReplyCommentRef.current ?? targetRootCommentRef.current;
      targetElement?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    const timerId = window.setTimeout(() => {
      setHighlightedCommentId(undefined);
    }, TARGET_COMMENT_HIGHLIGHT_MS);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(timerId);
    };
  }, [
    fallbackTargetReply,
    isTargetReplyLocated,
    pinnedTargetComment,
    targetComment,
    targetCommentId,
    targetRootId,
  ]);

  useEffect(() => {
    if (!targetRootId) {
      return;
    }

    setExpandedRootIds((currentIds) => {
      if (currentIds.has(targetRootId)) {
        return currentIds;
      }
      return new Set(currentIds).add(targetRootId);
    });

    return () => {
      setExpandedRootIds((currentIds) => {
        if (!currentIds.has(targetRootId)) {
          return currentIds;
        }
        const nextIds = new Set(currentIds);
        nextIds.delete(targetRootId);
        return nextIds;
      });
    };
  }, [targetRootId]);

  useEffect(() => {
    if (
      !targetRootId ||
      !targetReplyId ||
      isTargetReplyLocated ||
      !hasNextTargetReplyPage ||
      isFetchingNextTargetReplyPage
    ) {
      return;
    }

    void fetchNextTargetReplyPage();
  }, [
    fetchNextTargetReplyPage,
    hasNextTargetReplyPage,
    isFetchingNextTargetReplyPage,
    isTargetReplyLocated,
    targetReplyId,
    targetRootId,
  ]);

  useEffect(() => {
    if (!inView || !hasNextPage || isFetchingNextPage || !enabled) {
      return;
    }
    void fetchNextPage();
  }, [enabled, inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // 发评插队后滚回列表顶部；依赖 comments 以便列表插队渲染后再滚
  // biome-ignore lint/correctness/useExhaustiveDependencies: comments 用于等待列表更新后再 scroll
  useEffect(() => {
    if (!shouldScrollListToTop) {
      return;
    }

    listScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    setShouldScrollListToTop(false);
  }, [shouldScrollListToTop, comments]);

  const invalidateComments = () => {
    void queryClient.invalidateQueries({ queryKey: commentsQueryKey });
  };

  const refreshCommentsAndEngagement = () => {
    invalidateComments();
    void queryClient.invalidateQueries({
      queryKey: getPlayMediaDetailQueryKey(episodeApiId, contentType),
    });
  };

  /** 点赞成功后拉单条，局部写回 tags（作者赞过）等互动字段 */
  const syncCommentAfterLike = async (commentId: string) => {
    try {
      const response = await getPlayComment(commentId);
      const fresh = unwrapOrvalPayload<CommentResponse>(response);
      if (!fresh) {
        return;
      }

      queryClient.setQueryData(getPlayCommentQueryKey(commentId), response);

      queryClient.setQueryData(commentsQueryKey, (current) =>
        patchCommentInInfinitePages(current, commentId, fresh),
      );

      const rootId = readSnowflakeId(fresh.rootId);
      if (rootId) {
        queryClient.setQueriesData(
          { queryKey: getPlayCommentRepliesQueryKey(rootId) },
          (current) => patchCommentInInfinitePages(current, commentId, fresh),
        );
      }

      setReplyPages((currentPages) => {
        let changed = false;
        const nextPages: Record<string, CommentResponse[]> = {};

        for (const [pageRootId, replies] of Object.entries(currentPages)) {
          nextPages[pageRootId] = replies.map((reply) => {
            const next = patchCommentInTree(reply, commentId, fresh);
            if (next !== reply) {
              changed = true;
            }
            return next;
          });
        }

        return changed ? nextPages : currentPages;
      });

      setLikeOverlays((current) => ({
        ...current,
        [commentId]: {
          liked: Boolean(fresh.liked),
          likeCount: readCommentLikeCount(fresh.likeCount),
        },
      }));
    } catch {
      // 标签刷新失败不影响已成功的点赞态
    }
  };

  const postMutation = useMutation({
    mutationFn: (payload: {
      content: string;
      replyTarget: ReplyTarget | null;
    }) => {
      if (payload.replyTarget) {
        return postPlayCommentReply(payload.replyTarget.commentId, {
          content: payload.content,
        });
      }

      return postPlayComment(dramaId, episodeApiId, {
        content: payload.content,
      });
    },
    onSuccess: (response, variables) => {
      const created = unwrapOrvalPayload<CommentResponse>(response);
      const createdId = readSnowflakeId(created?.commentId);
      const activeReplyTarget = variables.replyTarget;
      setCommentDraft('');
      setIsEmojiOpen(false);

      if (activeReplyTarget) {
        const rootId =
          readSnowflakeId(created?.rootId) ?? activeReplyTarget.rootId;
        const targetCommentId = activeReplyTarget.commentId;
        const parentId = readSnowflakeId(created?.parentId);

        if (created && rootId) {
          setReplyPages((prev) => {
            const existing = prev[rootId] ?? [];
            return {
              ...prev,
              [rootId]: insertReplyNearTarget(existing, created, {
                rootId,
                targetCommentId,
                parentId,
              }),
            };
          });
          setExpandedRootIds((prev) => new Set(prev).add(rootId));
        }

        setReplyTarget(null);
      } else if (createdId) {
        setPendingInsertIds((prev) => [createdId, ...prev]);
        setShouldScrollListToTop(true);
      }

      refreshCommentsAndEngagement();
      toast.success(t('发表成功'));
    },
    onError: () => {
      toast.error(t('再试一次'));
    },
  });

  const likeCommentMutation = useMutation({
    mutationFn: ({
      commentId,
      liked,
    }: {
      commentId: string;
      liked: boolean;
      previous: { liked: boolean; likeCount?: number };
    }) => togglePlayLikeComment(dramaId, commentId, liked),
    onSuccess: (_data, variables) => {
      void syncCommentAfterLike(variables.commentId);
    },
    onError: (_error, variables) => {
      setLikeOverlays((current) => ({
        ...current,
        [variables.commentId]: variables.previous,
      }));
      toast.error(t('再试一次'));
    },
    onSettled: (_data, _error, variables) => {
      setPendingLikeCommentId((current) =>
        current === variables.commentId ? undefined : current,
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ commentId }: { commentId: string; rootId: string }) =>
      deletePlayComment(commentId),
    onSuccess: (_response, { commentId: deletedCommentId, rootId }) => {
      const deletedThreadIds = new Set([deletedCommentId, rootId]);
      for (const commentId of deletedThreadIds) {
        queryClient.removeQueries({
          queryKey: getPlayCommentQueryKey(commentId),
          exact: true,
        });
      }
      queryClient.removeQueries({
        queryKey: getPlayCommentRepliesQueryKey(rootId),
      });
      setDeletedCommentIds((currentIds) =>
        new Set(currentIds).add(deletedCommentId),
      );
      setPendingInsertIds((currentIds) =>
        currentIds.filter((commentId) => commentId !== deletedCommentId),
      );
      setReplyPages((currentPages) => {
        const nextPages: Record<string, CommentResponse[]> = {};
        for (const [rootId, replies] of Object.entries(currentPages)) {
          if (rootId !== deletedCommentId) {
            nextPages[rootId] = replies.filter(
              (reply) => readSnowflakeId(reply.commentId) !== deletedCommentId,
            );
          }
        }
        return nextPages;
      });
      setReplyTarget((currentTarget) =>
        currentTarget?.commentId === deletedCommentId ||
        currentTarget?.rootId === deletedCommentId
          ? null
          : currentTarget,
      );
      refreshCommentsAndEngagement();
      toast.success(t('删除成功'));
    },
    onError: () => {
      toast.error(t('再试一次'));
    },
  });

  const { data: reportTypeItems, isLoading: isReportReasonsLoading } = useQuery(
    {
      queryKey: getUgcReportTypesQueryKey('COMMENT'),
      queryFn: ({ signal }) => fetchUgcReportTypes('COMMENT', { signal }),
      enabled:
        reportOpen && !reportSubmitted && reportingCommentId !== undefined,
      retry: false,
    },
  );
  const reportReasonOptions = useMemo(
    () => mapUgcReportReasonOptions(reportTypeItems),
    [reportTypeItems],
  );
  const reportMutation = useMutation({
    mutationFn: (value: UgcReportFormValue) => {
      if (!reportingCommentId) {
        throw new Error('missing comment id');
      }

      return requestUgcReportComment({
        commentId: reportingCommentId,
        data: value,
      });
    },
    onSuccess: () => {
      setReportSubmitted(true);
    },
  });

  const commentDraftLength = commentDraft.length;
  const trimmedDraft = commentDraft.trim();
  const isDraftReady = trimmedDraft.length >= COMMENT_MIN_LENGTH;
  const isSubmitEnabled =
    isDraftReady &&
    !postMutation.isPending &&
    Boolean(replyTarget || episodeApiId);
  const commentPlaceholder = isLogin
    ? t('发布精彩评论...')
    : t('登录后发表评论');
  const emojiTheme = resolvedTheme === 'light' ? 'light' : 'dark';

  const handleSubmit = () => {
    if (!trimmedDraft) {
      toast.error(t('请输入有效内容'));
      return;
    }

    if (postMutation.isPending) {
      return;
    }

    if (!requireLogin()) {
      return;
    }

    if (!guardBlockedInteraction('comment')) {
      return;
    }

    postMutation.mutate({ content: trimmedDraft, replyTarget });
  };

  // Enter 发送，Ctrl+Enter 换行
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const next = `${commentDraft.slice(0, start)}\n${commentDraft.slice(end)}`;
      setCommentDraft(next.slice(0, COMMENT_MAX_LENGTH));
      requestAnimationFrame(() => {
        textarea.setSelectionRange(start + 1, start + 1);
      });
    }
  };

  // 未登录点占位条：仅 click 拉登录，避免可聚焦输入在关 Privy 后焦点回填连环弹窗
  const handleGuestComposerClick = () => {
    requireLogin();
  };

  const handleInsertEmoji = (emoji: string) => {
    if (!requireLogin()) {
      return;
    }

    if (!guardBlockedInteraction('comment')) {
      return;
    }

    const textarea = textareaRef.current;
    const selectionStart = textarea?.selectionStart ?? commentDraft.length;
    const selectionEnd = textarea?.selectionEnd ?? commentDraft.length;
    const nextValue = `${commentDraft.slice(0, selectionStart)}${emoji}${commentDraft.slice(selectionEnd)}`;
    const clipped = nextValue.slice(0, COMMENT_MAX_LENGTH);
    setCommentDraft(clipped);

    const nextCursor = Math.min(
      selectionStart + emoji.length,
      COMMENT_MAX_LENGTH,
    );

    requestAnimationFrame(() => {
      const node = textareaRef.current;
      if (!node) {
        return;
      }

      node.focus();
      node.setSelectionRange(nextCursor, nextCursor);
    });
  };

  // 评论点赞：先写 overlay 即时反馈，再请求；对齐视频点赞，不阻塞等列表 invalidate
  const handleToggleCommentLike = (
    commentId: string,
    liked: boolean,
    likeCount?: number,
  ) => {
    if (!requireLogin()) {
      return;
    }

    if (!guardBlockedInteraction('like')) {
      return;
    }

    if (pendingLikeCommentId === commentId) {
      return;
    }

    const desiredLiked = !liked;
    const baselineLikeCount = readCommentLikeCount(likeCount);
    const optimisticCount =
      baselineLikeCount === undefined
        ? undefined
        : Math.max(0, baselineLikeCount + (desiredLiked ? 1 : -1));

    setLikeOverlays((current) => ({
      ...current,
      [commentId]: { liked: desiredLiked, likeCount: optimisticCount },
    }));
    setPendingLikeCommentId(commentId);

    // 同步 patch 楼内回复本地列表，避免展开态读到旧 liked
    setReplyPages((currentPages) => {
      let changed = false;
      const nextPages: Record<string, CommentResponse[]> = {};

      for (const [rootId, replies] of Object.entries(currentPages)) {
        nextPages[rootId] = replies.map((reply) => {
          if (readSnowflakeId(reply.commentId) !== commentId) {
            return reply;
          }

          changed = true;
          return {
            ...reply,
            liked: desiredLiked,
            likeCount: optimisticCount,
          };
        });
      }

      return changed ? nextPages : currentPages;
    });

    likeCommentMutation.mutate({
      commentId,
      liked,
      previous: { liked, likeCount: baselineLikeCount },
    });
  };

  // 点回复：写入目标、聚焦输入，并给底栏一个轻提示动效
  const handleStartReply = (comment: CommentResponse, rootId: string) => {
    if (!requireLogin()) {
      return;
    }

    if (!guardBlockedInteraction('comment')) {
      return;
    }

    const commentId = readSnowflakeId(comment.commentId);
    if (!commentId) {
      return;
    }

    setReplyTarget({
      commentId,
      rootId,
      nickname: comment.nickname?.trim() || t('匿名用户'),
    });
    setComposerAttentionKey((current) => current + 1);
    setIsComposerHighlighted(true);

    const shell = composerShellRef.current;
    if (shell) {
      shell.classList.remove('play-comment-composer-attention');
      void shell.offsetWidth;
      shell.classList.add('play-comment-composer-attention');
    }

    window.setTimeout(() => {
      composerFooterRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
      textareaRef.current?.focus({ preventScroll: true });
    }, 0);
  };

  const handleDelete = (commentId: string, rootId: string) => {
    if (!requireLogin()) {
      return;
    }

    deleteMutation.mutate({ commentId, rootId });
  };

  const handleExpandReplies = async (root: CommentResponse) => {
    const rootId = readSnowflakeId(root.commentId);
    if (!rootId) {
      return;
    }

    if (expandedRootIds.has(rootId)) {
      setExpandedRootIds((prev) => {
        const next = new Set(prev);
        next.delete(rootId);
        return next;
      });
      return;
    }

    if (targetRootId === rootId) {
      setExpandedRootIds((prev) => new Set(prev).add(rootId));
      return;
    }

    const response = await listPlayCommentReplies(rootId, {
      pageSize: REPLY_FIRST_BATCH,
    });
    const pageData = unwrapOrvalPayload<PageDtoCommentResponse>(response);
    const featuredId = readSnowflakeId(root.featuredReply?.commentId);
    const list = pageData?.list ?? [];

    // 外显精选始终置顶
    const merged = featuredId
      ? [
          ...(root.featuredReply ? [root.featuredReply] : []),
          ...list.filter(
            (item) => readSnowflakeId(item.commentId) !== featuredId,
          ),
        ]
      : list;

    setReplyPages((prev) => ({ ...prev, [rootId]: merged }));
    setReplyMarks((prev) => ({ ...prev, [rootId]: pageData?.mark }));
    setReplyHasMore((prev) => ({
      ...prev,
      [rootId]: pageData?.hasMore ?? false,
    }));
    setExpandedRootIds((prev) => new Set(prev).add(rootId));
  };

  const handleLoadMoreReplies = async (rootId: string) => {
    const response = await listPlayCommentReplies(rootId, {
      pageSize: REPLY_MORE_BATCH,
      mark: replyMarks[rootId],
    });
    const pageData = unwrapOrvalPayload<PageDtoCommentResponse>(response);
    const list = pageData?.list ?? [];

    setReplyPages((prev) => ({
      ...prev,
      [rootId]: [...(prev[rootId] ?? []), ...list],
    }));
    setReplyMarks((prev) => ({ ...prev, [rootId]: pageData?.mark }));
    setReplyHasMore((prev) => ({
      ...prev,
      [rootId]: pageData?.hasMore ?? false,
    }));
  };

  const handleOpenReport = (commentId: string) => {
    if (!requireLogin()) {
      return;
    }

    setReportingCommentId(commentId);
    setReportSubmitted(false);
    setReportOpen(true);
  };

  function handleCloseReportDone() {
    setReportOpen(false);
    setReportSubmitted(false);
    setReportingCommentId(undefined);
  }

  const renderCommentBody = (
    comment: CommentResponse,
    options: { isRoot: boolean; rootId: string },
  ) => {
    const commentId = readSnowflakeId(comment.commentId);
    if (!commentId) {
      return null;
    }

    const timeLabel = comment.createdAt
      ? formatDateFromNowMillisecond(comment.createdAt)
      : '';
    const likeOverlay = likeOverlays[commentId];
    const isLiked = likeOverlay?.liked ?? (isLogin && (comment.liked ?? false));
    const displayLikeCount = readCommentLikeCount(
      likeOverlay?.likeCount ?? comment.likeCount,
    );
    // 子评直接回主评（parentId === rootId）不展示「回复 @xxx：」；仅回其它子评时展示
    const parentId = readSnowflakeId(comment.parentId);
    const isReplyToRoot =
      !options.isRoot && Boolean(parentId) && parentId === options.rootId;
    const replyToLabel =
      !options.isRoot && !isReplyToRoot
        ? comment.replyToNickname?.trim()
        : undefined;
    const avatarSize = options.isRoot ? 40 : 32;
    const nickname = comment.nickname?.trim() ?? t('匿名用户');
    const commentUserId = readSnowflakeId(comment.userId);
    // 自己的评论不展示举报「更多」；作者自评可能只有 AUTHOR 无 ME，须用 userId 判定
    const isOwnComment =
      (isLogin &&
        Boolean(comment.tags?.includes(CommentResponseTagsItem.ME))) ||
      (currentUserId !== undefined &&
        commentUserId !== undefined &&
        currentUserId === commentUserId);
    const canDeleteComment = Boolean(comment.deletable);
    const showMoreMenu = canDeleteComment || !isOwnComment;
    const replyCount = comment.replyCount ?? 0;
    const isExpanded = expandedRootIds.has(commentId);
    const isTargetThread =
      options.isRoot && targetRootId === commentId && Boolean(targetCommentId);
    const featuredReply = options.isRoot ? comment.featuredReply : undefined;
    const featuredReplyId = readSnowflakeId(featuredReply?.commentId);
    const collapsedFeaturedReply =
      featuredReply &&
      featuredReplyId &&
      !deletedCommentIds.has(featuredReplyId)
        ? featuredReply
        : undefined;
    const displayedReplies = isTargetThread
      ? mergeUniqueComments([
          comment.featuredReply,
          ...targetThreadReplies,
          fallbackTargetReply,
          ...(replyPages[commentId] ?? []),
        ])
      : (replyPages[commentId] ?? []);
    const visibleReplies = displayedReplies.filter((reply) => {
      const replyId = readSnowflakeId(reply.commentId);
      return replyId ? !deletedCommentIds.has(replyId) : false;
    });

    // 折叠和展开共用同一 keyed 列表，避免头像图片被卸载后重新闪烁
    const renderedReplies = isExpanded
      ? visibleReplies
      : collapsedFeaturedReply
        ? [collapsedFeaturedReply]
        : [];
    const hasMoreReplies = isTargetThread
      ? hasNextTargetReplyPage
      : replyHasMore[commentId];
    const isLocatingTargetReply =
      isTargetThread &&
      (isLoadingTargetReplies ||
        (isFetchingNextTargetReplyPage && !isTargetReplyLocated));
    // 折叠默认只露 featuredReply；其余条数用于「展开 N 条回复」
    const collapsedHiddenReplyCount = collapsedFeaturedReply
      ? Math.max(0, replyCount - 1)
      : replyCount;
    const showCollapsedExpandToggle =
      options.isRoot && !isExpanded && collapsedHiddenReplyCount > 0;
    // 只有 1 条可见回复时收起无意义（折叠态同样会露 featured / 同条），不展示「收起」
    const showExpandedCollapseToggle =
      options.isRoot &&
      isExpanded &&
      (Boolean(hasMoreReplies) || visibleReplies.length > 1);

    return (
      <article className={cn('flex items-start gap-3')}>
        <UserProfileAvatarLink
          userId={commentUserId}
          allowSelfNavigate
          className={cn(
            'shrink-0 transition-opacity hover:opacity-90',
            options.isRoot ? 'size-10' : 'size-8',
          )}
        >
          <UserProfileAvatarCircle
            userId={commentUserId}
            avatarUrl={comment.avatarUrl}
            size={avatarSize}
            alt={nickname}
            fallbackChar={getRoleAvatarFallback(comment.nickname)}
            containerClassName={cn(
              'shrink-0',
              options.isRoot ? 'size-10' : 'size-8',
            )}
          />
        </UserProfileAvatarLink>
        <div
          className={cn(
            'flex min-w-0 flex-1 flex-col',
            options.isRoot ? 'gap-4' : 'gap-3',
          )}
        >
          <div className={cn('flex flex-col gap-3')}>
            <div className={cn('flex flex-col gap-1.5')}>
              <div
                className={cn(
                  'flex min-w-0 items-center justify-between gap-2',
                )}
              >
                <div className={cn('flex min-w-0 flex-1 items-center gap-1.5')}>
                  <UserProfileAvatarLink
                    userId={commentUserId}
                    allowSelfNavigate
                    className={cn('min-w-0 max-w-full')}
                  >
                    <h3
                      className={cn(
                        'min-w-0 truncate font-normal text-foreground',
                        'transition-opacity hover:opacity-90',
                        options.isRoot
                          ? 'text-sm leading-5'
                          : 'text-[13px] leading-[18px]',
                      )}
                    >
                      {nickname}
                    </h3>
                  </UserProfileAvatarLink>
                  <CommentTagChips tags={comment.tags} placement="identity" />
                </div>
                {showMoreMenu ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      className={cn(
                        // Layout — Figma 80:98277 / 76:78930：16×16 三点，无圆形底
                        'inline-flex size-4 shrink-0 items-center justify-center p-0',
                        'text-foreground outline-none',
                        'transition-opacity hover:opacity-70',
                        'data-popup-open:opacity-70',
                      )}
                      aria-label={t('更多')}
                    >
                      <IconCommentMore className="block size-4 shrink-0" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className={cn(
                        'flex w-auto min-w-24 flex-col items-stretch gap-0 p-0',
                        'rounded-2xl border-0 bg-site-settings-panel-surface ring-0',
                        'shadow-[1px_5px_20px_rgba(0,0,0,0.13)]',
                      )}
                    >
                      {isOwnComment ? null : (
                        <DropdownMenuItem
                          onClick={() => {
                            handleOpenReport(commentId);
                          }}
                          className={cn(
                            'flex min-h-14 items-center justify-start gap-3 rounded-2xl px-4 py-4',
                            'text-sm leading-5 text-muted-foreground',
                            'transition-colors hover:bg-transparent hover:text-foreground',
                            'focus:bg-transparent focus:text-foreground',
                          )}
                        >
                          <IconAlertTriangle className="size-6 shrink-0" />
                          {t('举报')}
                        </DropdownMenuItem>
                      )}
                      {canDeleteComment ? (
                        <DropdownMenuItem
                          onClick={() => {
                            handleDelete(commentId, options.rootId);
                          }}
                          className={cn(
                            'flex min-h-14 items-center justify-start gap-3 rounded-2xl px-4 py-4',
                            'text-sm leading-5 text-muted-foreground',
                            'transition-colors hover:bg-transparent hover:text-foreground',
                            'focus:bg-transparent focus:text-foreground',
                          )}
                        >
                          <IconTrash className="size-6 shrink-0" />
                          {t('删除')}
                        </DropdownMenuItem>
                      ) : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}
              </div>

              <div className={cn('flex min-w-0 flex-col gap-1')}>
                <p
                  className={cn(
                    'min-w-0 wrap-anywhere text-foreground',
                    options.isRoot
                      ? 'text-[15px] leading-[22px]'
                      : 'text-sm leading-5',
                  )}
                >
                  {replyToLabel ? (
                    <>
                      <span>{t('回复')}</span>
                      <span className="text-muted-foreground">
                        {' '}
                        @{replyToLabel}
                      </span>
                      <span>：</span>
                    </>
                  ) : null}
                  {comment.content}
                </p>
                <CommentTagChips tags={comment.tags} placement="content" />
                {timeLabel ? (
                  <time
                    className={cn(
                      'text-xs leading-4 tracking-[0.04px] text-muted-foreground',
                    )}
                  >
                    {timeLabel}
                  </time>
                ) : null}
              </div>
            </div>

            <div className={cn('flex items-center gap-3')}>
              <Button
                type="button"
                variant="ghost"
                onClick={() =>
                  handleToggleCommentLike(commentId, isLiked, displayLikeCount)
                }
                className={cn(
                  'inline-flex h-auto w-fit items-center gap-1 px-0 py-0',
                  'text-[13px] leading-[18px] text-muted-foreground',
                  'hover:bg-transparent hover:text-foreground',
                )}
              >
                {isLiked ? (
                  <IconCommentLikeFilled
                    aria-hidden
                    className="size-[18px] shrink-0 text-destructive"
                  />
                ) : (
                  <IconCommentLikeOutline
                    aria-hidden
                    className="size-[18px] shrink-0"
                  />
                )}
                <span>
                  {displayLikeCount !== undefined
                    ? formatNumber(displayLikeCount, 0)
                    : '0'}
                </span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => handleStartReply(comment, options.rootId)}
                className={cn(
                  'inline-flex h-auto items-center gap-1 px-0 py-0',
                  'text-[13px] leading-[18px] text-muted-foreground',
                  'hover:bg-transparent hover:text-foreground',
                )}
              >
                <IconCommentMessage className="size-[18px] shrink-0" />
                {t('回复')}
              </Button>
            </div>
          </div>

          {options.isRoot &&
          (renderedReplies.length > 0 ||
            showCollapsedExpandToggle ||
            isLocatingTargetReply ||
            hasMoreReplies ||
            showExpandedCollapseToggle) ? (
            <div className={cn('flex flex-col gap-4')}>
              {renderedReplies.map((reply) => {
                const replyId = readSnowflakeId(reply.commentId);
                return (
                  <div
                    key={replyId ?? reply.content}
                    ref={
                      replyId === targetCommentId ? targetReplyCommentRef : null
                    }
                    className={cn(
                      'rounded-lg transition-colors duration-700',
                      replyId === highlightedCommentId && 'bg-foreground/10',
                    )}
                  >
                    {renderCommentBody(reply, {
                      isRoot: false,
                      rootId: commentId,
                    })}
                  </div>
                );
              })}
              {!isExpanded && showCollapsedExpandToggle ? (
                <CommentThreadToggle
                  label={t('展开{{count}}条回复', {
                    count: collapsedHiddenReplyCount,
                  })}
                  icon="down"
                  onClick={() => {
                    void handleExpandReplies(comment);
                  }}
                />
              ) : null}
              {isExpanded && isLocatingTargetReply ? (
                <div className={cn('flex justify-center py-4')}>
                  <Spinner className="size-5 text-muted-foreground" />
                </div>
              ) : null}
              {isExpanded && (hasMoreReplies || showExpandedCollapseToggle) ? (
                <div className={cn('flex items-center gap-2')}>
                  <span
                    className="block h-px w-[22px] shrink-0 bg-border"
                    aria-hidden
                  />
                  {hasMoreReplies ? (
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={isTargetThread && isFetchingNextTargetReplyPage}
                      onClick={() => {
                        if (isTargetThread) {
                          void fetchNextTargetReplyPage();
                        } else {
                          void handleLoadMoreReplies(commentId);
                        }
                      }}
                      className={cn(
                        'inline-flex h-auto items-center gap-0 px-0 py-0',
                        'text-[13px] leading-[18px] text-muted-foreground',
                        'hover:bg-transparent hover:text-foreground',
                      )}
                    >
                      {t('展开更多')}
                      <IconChevronDown className="size-4" />
                    </Button>
                  ) : null}
                  {showExpandedCollapseToggle ? (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        void handleExpandReplies(comment);
                      }}
                      className={cn(
                        'inline-flex h-auto items-center gap-0 px-0 py-0',
                        'text-[13px] leading-[18px] text-muted-foreground',
                        'hover:bg-transparent hover:text-foreground',
                      )}
                    >
                      {t('收起')}
                      <IconChevronUp className="size-4" />
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </article>
    );
  };

  const remainingChars = COMMENT_MAX_LENGTH - commentDraftLength;
  const showCharCount = commentDraftLength > 0 || remainingChars < 0;

  // 收起态：无内容、未聚焦、未打开 emoji、未回复
  const isComposerCollapsed =
    commentDraftLength === 0 &&
    !isComposerFocused &&
    !isEmojiOpen &&
    !replyTarget;

  return (
    <>
      <div className={cn('flex h-full min-h-0 flex-col')}>
        <div
          ref={listScrollRef}
          className={cn('min-h-0 flex-1 overflow-y-auto px-4 pt-4')}
        >
          <p className={cn('mb-3 text-sm leading-5 text-foreground')}>
            {commentCount !== undefined
              ? t('全部评论（{{count}}）', { count: commentCount })
              : t('全部评论')}
          </p>

          <ul
            className={cn(
              'flex list-none flex-col gap-4 p-0',
              comments.length > 0 && 'pb-4',
            )}
          >
            {comments.map((comment) => {
              const commentId = readSnowflakeId(comment.commentId);
              if (!commentId) {
                return null;
              }

              return (
                <li
                  key={commentId}
                  ref={
                    commentId === targetCommentId ? targetRootCommentRef : null
                  }
                  className={cn(
                    'scroll-mt-2 rounded-lg pb-2 transition-colors duration-700',
                    commentId === highlightedCommentId && 'bg-foreground/10',
                  )}
                >
                  {renderCommentBody(comment, {
                    isRoot: true,
                    rootId: commentId,
                  })}
                </li>
              );
            })}
          </ul>

          {isLoading || isLoadingTargetComment ? (
            <div className={cn('flex justify-center py-8')}>
              <Spinner className="size-6 text-muted-foreground" />
            </div>
          ) : null}

          {isError ? (
            <p className={cn('py-4 text-center text-sm text-muted-foreground')}>
              {t('再试一次')}
            </p>
          ) : null}

          {!isLoading &&
          !isLoadingTargetComment &&
          !isError &&
          comments.length === 0 ? (
            <div
              className={cn(
                'flex flex-col items-center justify-center gap-3 py-16',
              )}
            >
              <IconNoData className="size-[88px]" aria-hidden />
              <p className={cn('text-sm leading-5 text-muted-foreground')}>
                {t('暂无数据')}
              </p>
            </div>
          ) : null}

          {hasNextPage ? (
            <div ref={ref} className={cn('flex justify-center py-2')}>
              {isFetchingNextPage ? (
                <Spinner className="size-5 text-muted-foreground" />
              ) : null}
            </div>
          ) : null}
        </div>

        <footer
          ref={composerFooterRef}
          className={cn(
            // Layout
            'relative shrink-0',
            // Spacing — H5 弹窗底栏留安全区；桌面侧栏还原 pt-2 + pb-3
            'px-4 pb-[34px] md:pb-3 md:pt-2',
            // Visual — H5 透明底栏；桌面侧栏 secondary/90 + blur（7c087b58）
            'bg-transparent backdrop-blur-[10px] md:bg-secondary/90',
          )}
        >
          <h2 className="sr-only">{t('发表评论')}</h2>
          {isEmojiOpen ? (
            <div
              ref={emojiPanelRef}
              className={cn(
                'mb-2 overflow-hidden rounded-xl border border-border',
                'max-md:absolute max-md:inset-x-4 max-md:bottom-full max-md:z-20 max-md:bg-background max-md:shadow-lg',
                '[&_em-emoji-picker]:max-h-[220px] [&_em-emoji-picker]:w-full [&_em-emoji-picker]:min-w-[280px]',
              )}
              style={emojiPickerCssVars}
            >
              <Suspense
                fallback={
                  <div className="flex h-[220px] items-center justify-center bg-background text-muted-foreground text-sm">
                    Loading...
                  </div>
                }
              >
                <EmojiPicker
                  data={emojiData}
                  onEmojiSelect={(emoji: { native: string }) => {
                    handleInsertEmoji(emoji.native);
                  }}
                  locale="zh"
                  theme={emojiTheme}
                  set="native"
                  perLine={8}
                  maxFrequentRows={1}
                  previewPosition="none"
                  searchPosition="none"
                  skinTonePosition="none"
                  navPosition="top"
                  dynamicWidth={true}
                />
              </Suspense>
            </div>
          ) : null}

          {replyTarget ? (
            <div
              key={`reply-banner-${composerAttentionKey}`}
              className={cn(
                'mb-2 flex items-center justify-between gap-2',
                'rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground',
                'play-comment-composer-attention',
              )}
            >
              <span>
                {t('回复')} @{replyTarget.nickname}
              </span>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setReplyTarget(null);
                }}
                className="h-auto px-0 py-0 text-xs"
              >
                {t('取消')}
              </Button>
            </div>
          ) : null}

          <div
            ref={composerShellRef}
            className={cn(
              'flex rounded-[12px] bg-secondary p-3 md:rounded-xl md:bg-background',
              isComposerCollapsed ? 'items-center gap-3' : 'flex-col gap-2',
              isComposerHighlighted && 'bg-muted',
              commentDraftLength > 40 && 'border border-border',
            )}
          >
            {isLogin ? (
              <Textarea
                ref={textareaRef}
                value={commentDraft}
                onChange={(event) => {
                  setCommentDraft(
                    event.target.value.slice(0, COMMENT_MAX_LENGTH),
                  );
                }}
                onFocus={() => setIsComposerFocused(true)}
                onBlur={() => setIsComposerFocused(false)}
                onKeyDown={handleKeyDown}
                placeholder={commentPlaceholder}
                rows={1}
                className={cn(
                  'min-h-[22px] resize-none rounded-none border-0 bg-transparent p-0 shadow-none',
                  'text-[15px] leading-[22px] text-foreground',
                  'placeholder:text-muted-foreground',
                  'focus-visible:border-0 focus-visible:ring-0',
                  'dark:bg-transparent',
                  isComposerCollapsed && 'min-w-0 flex-1',
                )}
              />
            ) : (
              <Button
                type="button"
                variant="ghost"
                onClick={handleGuestComposerClick}
                className={cn(
                  'h-auto min-h-[22px] justify-start rounded-none p-0',
                  'text-[15px] leading-[22px] font-normal text-muted-foreground',
                  'hover:bg-transparent hover:text-muted-foreground',
                  isComposerCollapsed ? 'min-w-0 flex-1' : 'w-full',
                )}
              >
                {commentPlaceholder}
              </Button>
            )}
            <div
              className={cn(
                'flex items-center gap-3',
                !isComposerCollapsed && 'justify-end',
              )}
            >
              {showCharCount ? (
                <span
                  className={cn(
                    'text-[15px] leading-[22px]',
                    remainingChars < 0
                      ? 'text-destructive'
                      : 'text-muted-foreground',
                  )}
                >
                  {remainingChars}
                </span>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (!requireLogin()) {
                    return;
                  }

                  setIsEmojiOpen((open) => !open);
                }}
                aria-label={t('表情')}
                aria-pressed={isEmojiOpen}
                className={cn(
                  'size-6 shrink-0 rounded-none p-0',
                  'text-muted-foreground hover:bg-transparent hover:text-foreground',
                )}
              >
                <IconMoodSmile className="size-6 md:size-5" />
              </Button>
              <Button
                type="button"
                size="icon"
                disabled={!isLogin || !isSubmitEnabled}
                onClick={handleSubmit}
                aria-label={t('发送')}
                className={cn(
                  'size-6 shrink-0 rounded-full p-0 shadow-none',
                  isDraftReady
                    ? 'bg-foreground text-background hover:bg-foreground/90 disabled:opacity-40'
                    : 'bg-muted-foreground text-white hover:bg-muted-foreground disabled:opacity-40',
                )}
              >
                <IconCommentSendArrow className="size-4" />
              </Button>
            </div>
          </div>
        </footer>
      </div>
      <UgcReportDialog
        open={reportOpen}
        isSubmitting={reportMutation.isPending}
        isReasonsLoading={isReportReasonsLoading}
        reasonOptions={reportReasonOptions}
        submitted={reportSubmitted}
        onCancel={() => setReportOpen(false)}
        onSubmit={(value) => reportMutation.mutate(value)}
        onDone={handleCloseReportDone}
      />
    </>
  );
}
