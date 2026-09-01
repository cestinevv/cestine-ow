import { useInfiniteQuery, useMutation } from '@tanstack/react-query';
import {
  getRouteApi,
  Link,
  useNavigate,
  useRouter,
} from '@tanstack/react-router';
import { MoreHorizontal, Plus, Trash2 } from 'lucide-react';
import {
  type FocusEvent,
  type SVGProps,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useInView } from 'react-intersection-observer';
import { toast } from 'sonner';

import {
  deleteDrama,
  getListDramasQueryKey,
  listDramas,
} from '@/api/__generated__/story/create-drama/create-drama';
import {
  deleteShortVideo,
  getListMyShortVideosQueryKey,
  listMyShortVideos,
} from '@/api/__generated__/story/create-shortvideo/create-shortvideo';
import { useGetCreatorStats } from '@/api/__generated__/story/create-stats/create-stats';
import type { ActorCollectionInfoResponse } from '@/api/__generated__/story/model/actorCollectionInfoResponse';
import type { BoundActorCollectionResponse } from '@/api/__generated__/story/model/boundActorCollectionResponse';
import type { DramaDetailResponse } from '@/api/__generated__/story/model/dramaDetailResponse';
import type { ListDramasParams } from '@/api/__generated__/story/model/listDramasParams';
import type { ShortVideoListItemResponse } from '@/api/__generated__/story/model/shortVideoListItemResponse';
import IconNoData from '@/assets/svg/IconNoData';
import { AppDialog } from '@/components/common/AppDialog';
import AppLoadingContainer from '@/components/common/AppLoadingContainer';
import {
  APP_DIALOG_PRIMARY_BUTTON_CLASS,
  APP_DIALOG_SECONDARY_BUTTON_CLASS,
} from '@/components/common/appDialogButton';
import { ContentContainer } from '@/components/common/ContentContainer';
import { ShortVideoCardCoverStats } from '@/components/common/ShortVideoCardCoverStats';
import { StickyContentToolbar } from '@/components/common/StickyContentToolbar';
import {
  FilterTabs,
  profileContentTabsListClassName,
  profileContentTabsWrapperClassName,
  profileContentTabTriggerClassName,
} from '@/components/common/Tabs';
import { UserProfileAvatarCircle } from '@/components/common/UserProfileAvatar';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PLAY_DRAMA_ACTOR_DISPLAY_LIMIT } from '@/features/play/constants/playDramaActorLimit';
import {
  formatPlayDramaCardMetaLabel,
  PLAY_CARD_COVER_ASPECT_CLASS,
  PLAY_THEATER_CARD_ROW_MIN_HEIGHT_PX,
  PLAY_THEATER_GRID_VIEW_CLASS,
  PLAY_THEATER_GRID_VIEW_DESKTOP_CLASS,
} from '@/features/play/playFormat';
import { usePlayPlaylistStore } from '@/features/play/playPlaylistStore';
import {
  PlayFeedContentType,
  type PlayImmersiveItem,
  PlayPlaylistSource,
} from '@/features/play/types/playImmersive';
import { openRouteInNewTab } from '@/routing/newTabRouteLink';
import useGlobalStore from '@/stores/global';
import { cn, resolveProfileAvatarUrl } from '@/utils';
import { SHOW_DEV_ONLY_UI } from '@/utils/env';
import { formatNumber } from '@/utils/formatNumber';
import { readSnowflakeId } from '@/utils/snowflakeId';
import {
  CreationReviewStatusBadge,
  getCreationReviewBadge,
} from './CreationReviewStatusBadge';
import {
  buildCreationDramaListParams,
  buildCreationShortVideoListParams,
  CREATION_MANAGEMENT_NO_CACHE_QUERY,
  CREATION_MANAGEMENT_TABS,
  CREATION_REVIEW_FILTERS,
  CreationManagementTab,
  type CreationReviewFilter,
  extractCreatorStats,
  getCreationActorId,
  getCreationActorName,
  getCreationActorRentTotal,
  getCreationCursorNextPageParam,
  getCreationDramaRows,
  getCreationPlayBlockToastKey,
  getCreationShortVideoRows,
  isCreationPlayableStatus,
} from './creationManagementFormat';

type DeleteTarget =
  | { type: 'drama'; id: number; title: string }
  | { type: 'video'; id: number; title: string };

function buildCreationDramaPlaylist(
  dramas: DramaDetailResponse[],
): PlayImmersiveItem[] {
  const playlist: PlayImmersiveItem[] = [];

  for (const drama of dramas) {
    if (!isCreationPlayableStatus(drama.status)) {
      continue;
    }

    const dramaId = readSnowflakeId(drama.id);
    if (!dramaId) {
      continue;
    }

    playlist.push({ dramaId });
  }

  return playlist;
}

function buildCreationVideoPlaylist(
  videos: ShortVideoListItemResponse[],
): PlayImmersiveItem[] {
  const playlist: PlayImmersiveItem[] = [];

  for (const video of videos) {
    if (!isCreationPlayableStatus(video.status)) {
      continue;
    }

    const episodeId = readSnowflakeId(video.episodeId);
    if (!episodeId) {
      continue;
    }

    playlist.push({
      dramaId: episodeId,
      episodeId,
      contentType: PlayFeedContentType.ShortVideo,
    });
  }

  return playlist;
}

type CreationDramaActor =
  | ActorCollectionInfoResponse
  | BoundActorCollectionResponse;

const FALLBACK_COVER_CLASS =
  'bg-[radial-gradient(circle_at_30%_20%,hsl(var(--muted))_0,hsl(var(--card))_48%,hsl(var(--muted))_100%)]';

const CREATION_LIST_EMPTY_STATE_CLASSNAME = 'gap-6 rounded-xl bg-card px-10';

const creationManagementRoute = getRouteApi('/creation-management');

function IconPublishDrama(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      {...props}
    >
      <title>Publish drama</title>
      <path
        d="M11.9974 21.5362C17.2642 21.5362 21.5338 17.2666 21.5338 11.9998C21.5338 6.73298 17.2642 2.46338 11.9974 2.46338C6.73054 2.46338 2.46094 6.73298 2.46094 11.9998C2.46094 17.2666 6.73054 21.5362 11.9974 21.5362Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15.7434 11.2787C16.2984 11.5991 16.2984 12.4002 15.7434 12.7207L10.7481 15.6047C10.1931 15.9251 9.49928 15.5246 9.49928 14.8837L9.49928 9.11564C9.49928 8.47475 10.1931 8.07419 10.7481 8.39464L15.7434 11.2787Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function IconPublishVideo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      {...props}
    >
      <title>Publish video</title>
      <path
        d="M10 9V15L15 12L10 9Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect
        x="2"
        y="4.5"
        width="20"
        height="15"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CreationManagementHeader() {
  const { t } = useTranslation();
  const [isPublishMenuOpen, setIsPublishMenuOpen] = useState(false);

  const publishItems = [
    {
      label: t('发布短剧'),
      to: '/create',
      Icon: IconPublishDrama,
    },
    {
      label: t('发布视频'),
      to: '/create-short-video',
      Icon: IconPublishVideo,
    },
  ] as const;

  function handlePublishMenuOpen() {
    setIsPublishMenuOpen(true);
  }

  function handlePublishMenuClose() {
    setIsPublishMenuOpen(false);
  }

  function handlePublishMenuBlur(event: FocusEvent<HTMLDivElement>) {
    const nextFocus = event.relatedTarget;
    if (nextFocus instanceof Node && event.currentTarget.contains(nextFocus)) {
      return;
    }

    setIsPublishMenuOpen(false);
  }

  return (
    <section className="flex w-full flex-col gap-4 rounded-xl bg-card p-5 md:flex-row md:items-center md:justify-between">
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="text-3xl leading-9 font-bold text-foreground">
          {t('内容管理')}
        </h1>
        <p className="text-sm leading-5 text-muted-foreground">
          {t('短剧/视频的发布与管理。')}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <a
          href="https://www.dreamos.xyz/"
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            buttonVariants({ variant: 'default' }),
            'h-11 rounded-xl bg-foreground px-4 text-sm leading-5 font-medium text-background no-underline',
            'hover:bg-foreground/90 [a]:hover:bg-foreground/90',
          )}
        >
          {t('创作短剧')}
        </a>
        {/* biome-ignore lint/a11y/noStaticElementInteractions: 悬停容器需同时包住按钮与下拉菜单 */}
        <div
          className="relative shrink-0"
          onMouseEnter={handlePublishMenuOpen}
          onMouseLeave={handlePublishMenuClose}
          onFocusCapture={handlePublishMenuOpen}
          onBlurCapture={handlePublishMenuBlur}
        >
          <Button
            type="button"
            size="icon"
            className={cn(
              'size-11 rounded-xl bg-destructive text-destructive-foreground',
              'hover:bg-destructive/90 [a]:hover:bg-destructive/90',
            )}
            aria-label={t('发布')}
          >
            <Plus className="size-5" />
          </Button>
          <nav
            className={cn(
              'absolute top-full right-0 z-50 pt-2',
              'transition-[opacity,visibility] duration-150',
              isPublishMenuOpen ? 'visible opacity-100' : 'invisible opacity-0',
            )}
            aria-label={t('发布')}
          >
            <div
              className={cn(
                // 按文案自适应加宽，避免长文案语言换行
                'flex w-max min-w-44 flex-col overflow-hidden rounded-xl bg-card',
                'border border-border shadow-lg',
              )}
            >
              {publishItems.map(({ label, to, Icon }, index) => (
                <Link
                  key={to}
                  to={to}
                  onClick={handlePublishMenuClose}
                  className={cn(
                    'flex items-center gap-3 px-4 py-4 text-[15px] leading-5.5 font-medium whitespace-nowrap text-foreground no-underline',
                    'transition-colors hover:bg-muted',
                    index > 0 && 'border-t border-border',
                  )}
                >
                  <Icon className="size-6 shrink-0 text-foreground" />
                  <span>{label}</span>
                </Link>
              ))}
            </div>
          </nav>
        </div>
      </div>
    </section>
  );
}

function CreationManagementTabs({
  value,
  counts,
  onValueChange,
  reviewFilter,
  onReviewFilterChange,
}: {
  value: CreationManagementTab;
  counts: Record<CreationManagementTab, number>;
  onValueChange: (value: CreationManagementTab) => void;
  reviewFilter: CreationReviewFilter;
  onReviewFilterChange: (value: CreationReviewFilter) => void;
}) {
  const { t } = useTranslation();

  return (
    <StickyContentToolbar aria-label={t('创作管理')} className="gap-3 pb-5">
      <Tabs
        value={value}
        onValueChange={(nextValue) =>
          onValueChange(nextValue as CreationManagementTab)
        }
        className="flex w-full flex-col gap-0"
      >
        <div className={profileContentTabsWrapperClassName}>
          <TabsList
            variant="line"
            className={cn(profileContentTabsListClassName, 'h-10 pt-0')}
          >
            {CREATION_MANAGEMENT_TABS.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className={cn(profileContentTabTriggerClassName, 'h-10')}
              >
                <span>{t(tab.labelKey)}</span>
                <span>({counts[tab.value]})</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>

      <FilterTabs
        items={CREATION_REVIEW_FILTERS}
        value={reviewFilter}
        onValueChange={(nextValue) =>
          onReviewFilterChange(nextValue as CreationReviewFilter)
        }
        t={t}
      />
    </StickyContentToolbar>
  );
}

function CreationEmptyState({
  type,
  reviewFilter,
}: {
  type: CreationManagementTab;
  reviewFilter: CreationReviewFilter;
}) {
  const { t } = useTranslation();
  const isDrama = type === CreationManagementTab.Dramas;
  const showPublishCta = reviewFilter === 'all' || reviewFilter === 'approved';
  const description = showPublishCta
    ? isDrama
      ? t('暂无内容，去发布短剧吧～')
      : t('暂无内容，去发布视频吧～')
    : t('暂无内容');

  return (
    <>
      <div className="flex w-52 max-w-full flex-col items-center gap-4">
        <IconNoData className="size-22 shrink-0" />
        <p className="min-w-full text-center text-sm leading-5 font-normal text-muted-foreground">
          {description}
        </p>
      </div>
      {showPublishCta ? (
        <Button
          className={cn(
            'h-auto rounded-xl px-8 py-2.5 text-sm leading-5 font-normal',
            'bg-foreground text-background hover:bg-foreground/90 hover:text-background',
          )}
          render={<Link to={isDrama ? '/create' : '/create-short-video'} />}
        >
          {t('去发布')}
        </Button>
      ) : null}
    </>
  );
}

function ActorRentDialog({
  open,
  actors,
  onOpenChange,
}: {
  open: boolean;
  actors: CreationDramaActor[];
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const router = useRouter();

  const handleOpenActorDetail = (actorId: string) => {
    openRouteInNewTab(router, {
      to: '/actor/$actorId',
      params: { actorId },
    });
  };

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('角色IP片酬')}
      width={440}
      maxHeight="80dvh"
    >
      <div className="flex flex-col gap-2">
        {actors.map((actor, index) => {
          const actorId = getCreationActorId(actor);
          const name = getCreationActorDisplayName(actor);
          const avatar = resolveProfileAvatarUrl(
            getCreationActorAvatarUrl(actor),
          );
          return (
            <button
              key={actorId ?? `${name}-${index}`}
              type="button"
              className="flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-muted"
              onClick={() => {
                if (actorId) {
                  handleOpenActorDetail(actorId);
                }
              }}
            >
              <UserProfileAvatarCircle
                userId={actorId}
                avatarUrl={avatar}
                size={40}
                alt={name}
                containerClassName="size-10"
              />
              <span className="min-w-0 flex-1 truncate text-sm leading-5 font-bold text-foreground">
                {name}
              </span>
              <span className="shrink-0 text-sm leading-5 text-muted-foreground">
                {formatNumber(actor.computingPower ?? 0, 2)} STORY/h
              </span>
            </button>
          );
        })}
      </div>
    </AppDialog>
  );
}

function getCreationActorDisplayName(actor: CreationDramaActor): string {
  return (
    ('name' in actor ? actor.name?.trim() : undefined) ||
    getCreationActorName(actor) ||
    '-'
  );
}

function getCreationActorAvatarUrl(
  actor: CreationDramaActor,
): string | undefined {
  return (
    ('avatarUrl' in actor ? actor.avatarUrl?.trim() : undefined) ||
    ('actorCollectionAvatar' in actor
      ? actor.actorCollectionAvatar?.trim()
      : undefined)
  );
}

function getCreationActorFallback(name: string): string {
  return name.trim().slice(0, 1).toUpperCase() || '-';
}

function getCreationDramaActionLabel(status: string | undefined): string {
  if (status === 'PENDING_REVIEW') {
    return '等待审核';
  }
  if (status === 'OFFLINE') {
    return '已下架';
  }
  return '编辑';
}

function isCreationDramaActionDisabled(status: string | undefined): boolean {
  return status === 'PENDING_REVIEW' || status === 'OFFLINE';
}

function CreationActorGlassPill({
  actors,
  rentTotal,
  onClick,
}: {
  actors: CreationDramaActor[];
  rentTotal: number;
  onClick: () => void;
}) {
  const previewActors = actors.slice(0, PLAY_DRAMA_ACTOR_DISPLAY_LIMIT);

  if (previewActors.length === 0) {
    return null;
  }

  return (
    <Button
      type="button"
      variant="ghost"
      className={cn(
        'inline-flex h-auto w-fit max-w-full items-center gap-1.5 rounded-full py-1 pr-2 pl-1',
        'border border-white/15 bg-white/25 text-white backdrop-blur-[2.5px] hover:bg-white/30 hover:text-white',
      )}
      onClick={onClick}
    >
      <span className="flex items-center">
        {previewActors.map((actor, index) => {
          const actorId = getCreationActorId(actor);
          const name = getCreationActorDisplayName(actor);
          const avatarUrl = resolveProfileAvatarUrl(
            getCreationActorAvatarUrl(actor),
          );

          return (
            <span
              key={actorId ?? `${name}-${index}`}
              className={cn(
                'relative size-8 shrink-0 overflow-hidden rounded-full border border-black/15 bg-muted',
                index > 0 ? '-ml-4' : undefined,
              )}
            >
              {avatarUrl ? (
                <img
                  alt=""
                  src={avatarUrl}
                  width={32}
                  height={32}
                  loading="lazy"
                  decoding="async"
                  className="size-full rounded-full object-cover"
                />
              ) : (
                <span className="flex size-full items-center justify-center text-xs font-bold text-muted-foreground">
                  {getCreationActorFallback(name)}
                </span>
              )}
              <span className="absolute right-0 bottom-0 size-2 rounded-full bg-[#e50815]" />
            </span>
          );
        })}
      </span>
      <span className="flex flex-col items-start leading-none">
        <span className="text-[13px] leading-4.5 font-bold">
          {formatNumber(rentTotal, 1)}
        </span>
        <span className="text-[10px] leading-3 tracking-[0.08px] text-white/80">
          STORY/h
        </span>
      </span>
    </Button>
  );
}

function CreationDramaCard({
  drama,
  onDelete,
  onBeforePlay,
}: {
  drama: DramaDetailResponse;
  onDelete: (target: DeleteTarget) => void;
  onBeforePlay?: () => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [rentOpen, setRentOpen] = useState(false);
  const title = drama.title?.trim() || '-';
  const dramaId = readSnowflakeId(drama.id);
  const badge = getCreationReviewBadge(drama.status);
  const actors = drama.boundActorCollections ?? [];
  const rentTotal = getCreationActorRentTotal(actors);
  const tags = drama.tags?.filter((tag) => tag.trim()).slice(0, 3) ?? [];
  const primaryTag = tags[0];
  const actionLabel = getCreationDramaActionLabel(drama.status);
  const actionDisabled = isCreationDramaActionDisabled(drama.status);
  const metaLabel = formatPlayDramaCardMetaLabel(t, primaryTag);

  function handleCoverPlayClick() {
    if (!isCreationPlayableStatus(drama.status)) {
      toast.error(t(getCreationPlayBlockToastKey(drama.status)));
      return;
    }

    if (!dramaId) {
      return;
    }

    onBeforePlay?.();
    void navigate({ to: '/play/$dramaId', params: { dramaId } });
  }

  return (
    <article className="flex min-w-0 flex-col overflow-hidden rounded-[10px] bg-theater-drama-card-surface text-card-foreground">
      <div
        className={cn(
          'relative isolate w-full overflow-hidden',
          PLAY_CARD_COVER_ASPECT_CLASS,
          FALLBACK_COVER_CLASS,
        )}
      >
        {drama.coverUrl ? (
          <img src={drama.coverUrl} alt="" className="size-full object-cover" />
        ) : null}
        <Button
          type="button"
          variant="ghost"
          className="absolute inset-0 z-1 size-full rounded-none p-0 hover:bg-transparent"
          aria-label={title}
          onClick={handleCoverPlayClick}
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-1 h-10 bg-linear-to-b from-transparent to-black/60" />
        <CreationReviewStatusBadge
          badge={badge}
          auditReason={drama.auditReason}
        />
        {drama.id !== undefined ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  className={cn(
                    'absolute top-3 right-3 z-2 flex items-center justify-center',
                    'rounded-[52px] bg-black/30 p-2 text-white hover:bg-black/40',
                  )}
                  aria-label={t('更多操作')}
                />
              }
            >
              <MoreHorizontal className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="min-w-32 rounded-2xl p-2"
            >
              <DropdownMenuItem
                className="flex items-center gap-3 text-destructive"
                onClick={() =>
                  onDelete({
                    type: 'drama',
                    id: drama.id as number,
                    title,
                  })
                }
              >
                <Trash2 className="size-5" />
                {t('删除')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
        {SHOW_DEV_ONLY_UI && actors.length > 0 ? (
          <div className="absolute bottom-3 left-3 z-2 flex max-w-[calc(100%-24px)] flex-col items-start">
            <CreationActorGlassPill
              actors={actors}
              rentTotal={rentTotal}
              onClick={() => setRentOpen(true)}
            />
          </div>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 p-3">
        <h2
          className="min-w-0 truncate break-all text-base leading-6 font-medium text-foreground"
          title={title}
        >
          {title}
        </h2>
        {metaLabel ? (
          <p className="truncate text-xs leading-4 tracking-[0.04px] text-muted-foreground">
            {metaLabel}
          </p>
        ) : null}
        <Button
          type="button"
          variant="outline"
          disabled={actionDisabled}
          className={cn(
            'mt-0 h-12 w-full rounded-xl border-[1.5px] border-border bg-transparent px-4 py-2.5',
            'text-sm leading-5 font-bold text-foreground hover:bg-muted/40',
            'disabled:border-border disabled:bg-transparent disabled:text-button-disabled-foreground',
          )}
          onClick={() => {
            if (!actionDisabled && dramaId) {
              void navigate({ to: '/edit', search: { dramaId } });
            }
          }}
        >
          {t(actionLabel)}
        </Button>
      </div>

      <ActorRentDialog
        open={rentOpen}
        actors={actors}
        onOpenChange={setRentOpen}
      />
    </article>
  );
}

function CreationVideoCard({
  video,
  onDelete,
  onBeforePlay,
}: {
  video: ShortVideoListItemResponse;
  onDelete: (target: DeleteTarget) => void;
  onBeforePlay?: () => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const episodeId = readSnowflakeId(video.episodeId);
  const title = video.title?.trim() || video.description?.trim() || t('短视频');
  const description = video.description?.trim();
  const badge = getCreationReviewBadge(video.status);
  const actionLabel = getCreationDramaActionLabel(video.status);
  const actionDisabled = isCreationDramaActionDisabled(video.status);

  function handleEditClick() {
    if (!actionDisabled && episodeId) {
      void navigate({
        to: '/create-short-video',
        search: { episodeId },
      });
    }
  }

  function handleCoverPlayClick() {
    if (!isCreationPlayableStatus(video.status)) {
      toast.error(t(getCreationPlayBlockToastKey(video.status)));
      return;
    }

    if (!episodeId) {
      return;
    }

    onBeforePlay?.();
    void navigate({
      to: '/play/$dramaId',
      params: { dramaId: episodeId },
      search: {
        contentType: PlayFeedContentType.ShortVideo,
        episodeId,
      },
    });
  }

  return (
    <article className="group relative flex min-w-0 flex-col overflow-hidden rounded-[10px] bg-card">
      <div
        className={cn(
          'relative isolate w-full overflow-hidden',
          PLAY_CARD_COVER_ASPECT_CLASS,
          FALLBACK_COVER_CLASS,
        )}
      >
        {video.coverUrl ? (
          <img src={video.coverUrl} alt="" className="size-full object-cover" />
        ) : null}
        <Button
          type="button"
          variant="ghost"
          className="absolute inset-0 z-1 size-full rounded-none p-0 hover:bg-transparent"
          aria-label={title}
          onClick={handleCoverPlayClick}
        />
        <CreationReviewStatusBadge
          badge={badge}
          auditReason={video.auditReason}
        />
        <ShortVideoCardCoverStats
          likeCount={video.likeCount}
          durationSec={video.durationSec}
          layout="creation"
        />
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className={cn(
                  'absolute top-3 right-3 z-2 flex items-center justify-center',
                  'rounded-[52px] bg-black/30 p-2 text-white hover:bg-black/40',
                )}
                aria-label={t('更多操作')}
              />
            }
          >
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-32 rounded-2xl p-2">
            {video.episodeId !== undefined ? (
              <DropdownMenuItem
                className="flex items-center gap-3 text-destructive"
                onClick={() =>
                  onDelete({
                    type: 'video',
                    id: video.episodeId as number,

                    title: description || title,
                  })
                }
              >
                <Trash2 className="size-5" />
                {t('删除')}
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 p-3">
        {description ? (
          <p
            className={cn(
              'line-clamp-2 min-h-12 min-w-0 wrap-anywhere',
              'text-base leading-6 font-normal text-foreground',
            )}
            title={description}
          >
            {description}
          </p>
        ) : (
          <h2
            className="min-w-0 truncate break-all text-base leading-6 font-medium text-foreground"
            title={title}
          >
            {title}
          </h2>
        )}
        <Button
          type="button"
          variant="outline"
          disabled={actionDisabled}
          className={cn(
            'mt-0 h-12 w-full rounded-xl border-[1.5px] border-border bg-transparent px-4 py-2.5',
            'text-sm leading-5 font-bold text-foreground hover:bg-muted/40',
            'disabled:border-border disabled:bg-transparent disabled:text-button-disabled-foreground',
          )}
          onClick={handleEditClick}
        >
          {t(actionLabel)}
        </Button>
      </div>
    </article>
  );
}

const DELETE_CONFIRM_TITLE_MAX_LENGTH = 10;

function truncateDeleteConfirmTitle(title: string | undefined): string {
  const trimmed = title?.trim() ?? '';
  if (trimmed.length <= DELETE_CONFIRM_TITLE_MAX_LENGTH) {
    return trimmed;
  }

  return `${trimmed.slice(0, DELETE_CONFIRM_TITLE_MAX_LENGTH)}...`;
}

function DeleteConfirmDialog({
  target,
  isPending,
  onCancel,
  onConfirm,
}: {
  target: DeleteTarget | null;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { t } = useTranslation();
  const isVideo = target?.type === 'video';

  return (
    <AppDialog
      open={target !== null}
      onOpenChange={(open) => {
        if (!open && !isPending) {
          onCancel();
        }
      }}
      title=""
      width={343}
      bodyScroll={false}
      hideHeader
      bodyClassName="px-5 pt-6 pb-5"
    >
      <div className="flex flex-col items-center gap-4">
        <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
          <Trash2 className="size-6 text-destructive" />
        </div>

        <div className="flex flex-col items-center gap-2">
          <h2 className="text-base leading-6 font-semibold text-foreground">
            {isVideo ? t('删除视频确认') : t('删除短剧确认')}
          </h2>
          <p className="text-center text-sm leading-5 text-muted-foreground">
            {isVideo
              ? t('您确定要删除 "{{title}}" 吗？', {
                  title: truncateDeleteConfirmTitle(target?.title),
                })
              : t('您确定要删除该短剧吗？')}
            <br />
            {t('此操作无法撤销')}
          </p>
        </div>

        <div className="flex w-full gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            className={cn(APP_DIALOG_SECONDARY_BUTTON_CLASS, 'font-medium')}
            onClick={onCancel}
          >
            {t('否')}
          </Button>
          <Button
            type="button"
            disabled={isPending}
            className={cn(APP_DIALOG_PRIMARY_BUTTON_CLASS, 'font-medium')}
            onClick={onConfirm}
          >
            {isPending ? <Spinner className="size-4" /> : null}
            {t('是')}
          </Button>
        </div>
      </div>
    </AppDialog>
  );
}

export function CreationManagementView() {
  const { t, i18n } = useTranslation();
  const { tab } = creationManagementRoute.useSearch();
  const navigateToCreationTab = creationManagementRoute.useNavigate();
  const userId = useGlobalStore((state) => state.userProfile?.userId);
  const creatorUserId = readSnowflakeId(userId);
  const setPlaylist = usePlayPlaylistStore((state) => state.setPlaylist);
  const activeTab = tab ?? CreationManagementTab.Dramas;
  const [reviewFilter, setReviewFilter] = useState<CreationReviewFilter>('all');
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const { ref: dramaMoreRef, inView: dramaMoreInView } = useInView();
  const { ref: videoMoreRef, inView: videoMoreInView } = useInView();
  const languageQueryPart = i18n.language;
  const isDramaTab = activeTab === CreationManagementTab.Dramas;
  const isVideoTab = activeTab === CreationManagementTab.Videos;

  const creatorStatsQuery = useGetCreatorStats(
    (creatorUserId ?? '0') as unknown as number,
    {
      query: {
        enabled: Boolean(creatorUserId),
        retry: false,
        ...CREATION_MANAGEMENT_NO_CACHE_QUERY,
      },
    },
  );
  const creatorStats = useMemo(
    () => extractCreatorStats(creatorStatsQuery.data),
    [creatorStatsQuery.data],
  );

  const dramaListParams = useMemo(
    () => buildCreationDramaListParams(reviewFilter),
    [reviewFilter],
  );

  const dramaQuery = useInfiniteQuery({
    queryKey: [...getListDramasQueryKey(dramaListParams), languageQueryPart],
    queryFn: ({ pageParam, signal }) => {
      const params: ListDramasParams = {
        ...dramaListParams,
        ...(pageParam !== undefined ? { mark: pageParam as number } : {}),
      };
      return listDramas(params, { signal });
    },
    initialPageParam: undefined as number | undefined,
    getNextPageParam: getCreationCursorNextPageParam,
    enabled: isDramaTab,
    retry: false,
    ...CREATION_MANAGEMENT_NO_CACHE_QUERY,
  });

  const videoListParams = useMemo(
    () => buildCreationShortVideoListParams(reviewFilter),
    [reviewFilter],
  );

  const videoQuery = useInfiniteQuery({
    queryKey: [
      ...getListMyShortVideosQueryKey(videoListParams),
      languageQueryPart,
    ],
    queryFn: ({ pageParam, signal }) =>
      listMyShortVideos(
        {
          ...videoListParams,
          ...(pageParam !== undefined ? { mark: pageParam as number } : {}),
        },
        { signal },
      ),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: getCreationCursorNextPageParam,
    enabled: isVideoTab,
    retry: false,
    ...CREATION_MANAGEMENT_NO_CACHE_QUERY,
  });

  const dramaRows = useMemo(
    () => getCreationDramaRows(dramaQuery.data?.pages),
    [dramaQuery.data?.pages],
  );
  const videoRows = useMemo(
    () => getCreationShortVideoRows(videoQuery.data?.pages),
    [videoQuery.data?.pages],
  );

  useEffect(() => {
    if (
      dramaMoreInView &&
      dramaQuery.hasNextPage &&
      !dramaQuery.isFetchingNextPage
    ) {
      void dramaQuery.fetchNextPage();
    }
  }, [dramaMoreInView, dramaQuery]);

  useEffect(() => {
    if (
      videoMoreInView &&
      videoQuery.hasNextPage &&
      !videoQuery.isFetchingNextPage
    ) {
      void videoQuery.fetchNextPage();
    }
  }, [videoMoreInView, videoQuery]);

  const currentRows = isDramaTab ? dramaRows : videoRows;
  const currentQuery = isDramaTab ? dramaQuery : videoQuery;
  const isListLoading =
    currentQuery.isPending ||
    (currentQuery.isFetching && !currentQuery.isFetchingNextPage);

  const deleteMutation = useMutation({
    mutationFn: async (target: DeleteTarget) => {
      if (target.type === 'drama') {
        return deleteDrama(target.id);
      }
      return deleteShortVideo(target.id);
    },
    onSuccess: async (_data, target) => {
      toast.success(t('删除成功'));
      setDeleteTarget(null);
      await creatorStatsQuery.refetch();
      if (target.type === 'drama') {
        await dramaQuery.refetch();
        return;
      }
      await videoQuery.refetch();
    },
  });

  function handleConfirmDelete() {
    if (deleteTarget) {
      deleteMutation.mutate(deleteTarget);
    }
  }

  function handleActiveTabChange(value: CreationManagementTab) {
    void navigateToCreationTab({
      search: (prev) => ({
        ...prev,
        tab: value === CreationManagementTab.Dramas ? undefined : value,
      }),
      replace: true,
      resetScroll: false,
    });
    setReviewFilter('all');
  }

  function handleDramaBeforePlay() {
    setPlaylist(
      PlayPlaylistSource.Creation,
      buildCreationDramaPlaylist(dramaRows),
      {
        hasMore: Boolean(dramaQuery.hasNextPage),
        loadMore: async () => {
          const result = await dramaQuery.fetchNextPage();
          return {
            items: buildCreationDramaPlaylist(
              getCreationDramaRows(result.data?.pages),
            ),
            hasMore: Boolean(result.hasNextPage),
          };
        },
      },
    );
  }

  function handleVideoBeforePlay() {
    setPlaylist(
      PlayPlaylistSource.Creation,
      buildCreationVideoPlaylist(videoRows),
      {
        hasMore: Boolean(videoQuery.hasNextPage),
        loadMore: async () => {
          const result = await videoQuery.fetchNextPage();
          return {
            items: buildCreationVideoPlaylist(
              getCreationShortVideoRows(result.data?.pages),
            ),
            hasMore: Boolean(result.hasNextPage),
          };
        },
      },
    );
  }

  return (
    <main className="flex min-h-0 w-full min-w-0 flex-1 flex-col bg-points-page-surface-muted">
      <ContentContainer className="flex flex-col gap-5 py-3">
        <CreationManagementHeader />

        <section className="flex w-full flex-col gap-0">
          <CreationManagementTabs
            value={activeTab}
            counts={{
              dramas: creatorStats?.dramaCount ?? 0,
              videos: creatorStats?.shortVideoCount ?? 0,
            }}
            onValueChange={handleActiveTabChange}
            reviewFilter={reviewFilter}
            onReviewFilterChange={setReviewFilter}
          />

          <AppLoadingContainer
            data={currentRows}
            isLoading={isListLoading}
            isError={currentQuery.isError}
            // Loading / 空态同高（一行卡片）；Spinner 由容器 minHeight 垂直居中
            minHeight={PLAY_THEATER_CARD_ROW_MIN_HEIGHT_PX}
            scrollable={false}
            stateClassName={
              isListLoading ? undefined : CREATION_LIST_EMPTY_STATE_CLASSNAME
            }
            emptyContent={
              <CreationEmptyState
                type={activeTab}
                reviewFilter={reviewFilter}
              />
            }
          >
            <section
              className={cn(
                PLAY_THEATER_GRID_VIEW_CLASS,
                PLAY_THEATER_GRID_VIEW_DESKTOP_CLASS,
              )}
            >
              {isDramaTab
                ? dramaRows.map((drama) => (
                    <CreationDramaCard
                      key={readSnowflakeId(drama.id) ?? String(drama.id)}
                      drama={drama}
                      onDelete={setDeleteTarget}
                      onBeforePlay={handleDramaBeforePlay}
                    />
                  ))
                : videoRows.map((video) => (
                    <CreationVideoCard
                      key={
                        readSnowflakeId(video.episodeId) ??
                        String(video.episodeId)
                      }
                      video={video}
                      onDelete={setDeleteTarget}
                      onBeforePlay={handleVideoBeforePlay}
                    />
                  ))}
            </section>
          </AppLoadingContainer>

          {isDramaTab && dramaQuery.hasNextPage ? (
            <div
              ref={dramaMoreRef}
              className="flex min-h-12 items-center justify-center"
            >
              {dramaQuery.isFetchingNextPage ? (
                <Spinner className="size-6" />
              ) : null}
            </div>
          ) : null}

          {!isDramaTab && videoQuery.hasNextPage ? (
            <div
              ref={videoMoreRef}
              className="flex min-h-12 items-center justify-center"
            >
              {videoQuery.isFetchingNextPage ? (
                <Spinner className="size-6" />
              ) : null}
            </div>
          ) : null}
        </section>
      </ContentContainer>

      <DeleteConfirmDialog
        target={deleteTarget}
        isPending={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </main>
  );
}
