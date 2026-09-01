import { useTranslation } from 'react-i18next';
import type { DramaEpisodeListItemResponse } from '@/api/__generated__/story/model/dramaEpisodeListItemResponse';
import type { DramaInfo } from '@/api/__generated__/story/model/dramaInfo';
import type { RoleInfo } from '@/api/legacy/storyCompatModels';
import IconX from '@/assets/svg/IconX';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlayCommentsPanel } from '@/features/play/components/PlayCommentsPanel';
import { PlayImmersiveCharacterTab } from '@/features/play/components/PlayImmersiveCharacterTab';
import { PlayImmersiveDramaTab } from '@/features/play/components/PlayImmersiveDramaTab';
import {
  PlayFeedContentType,
  PlayImmersiveLayoutVariant,
  PlayImmersiveSideTab,
} from '@/features/play/types/playImmersive';
import { cn, SHOW_DEV_ONLY_UI } from '@/utils';

type PlayImmersiveSidePanelProps = {
  layoutVariant: PlayImmersiveLayoutVariant;
  tab: PlayImmersiveSideTab;
  onTabChange: (tab: PlayImmersiveSideTab) => void;
  onClose: () => void;
  dramaId: string;
  isShortVideo?: boolean;
  dramaInfo?: DramaInfo;
  roles?: RoleInfo[];
  totalEpisodes: number;
  episodes?: DramaEpisodeListItemResponse[];
  currentEpisode: number;
  episodeApiId?: string;
  commentCount?: number;
  creatorUserId?: string;
  targetCommentId?: string;
  onSelectEpisode: (episode: number) => void;
  resolveEpisodeLikeCount?: (
    episodeId: string | undefined,
    listLikeCount?: number,
  ) => number | undefined;
  dramaFavoritedByMe?: boolean;
  isDramaFavoritePending?: boolean;
  onToggleDramaFavorite?: () => void;
  onNotInterested?: () => void;
  className?: string;
};

const TAB_VALUES = [
  PlayImmersiveSideTab.Comment,
  PlayImmersiveSideTab.Drama,
  PlayImmersiveSideTab.Character,
] as const;

function isSideTab(value: string): value is PlayImmersiveSideTab {
  return (TAB_VALUES as readonly string[]).includes(value);
}

/** 右栏：评论 / 短剧 / 角色（短剧 Tab 按 Figma 推荐-短剧 还原） */
export function PlayImmersiveSidePanel({
  layoutVariant,
  tab,
  onTabChange,
  onClose,
  dramaId,
  isShortVideo = false,
  dramaInfo,
  roles,
  totalEpisodes,
  episodes,
  currentEpisode,
  episodeApiId,
  commentCount,
  creatorUserId,
  targetCommentId,
  onSelectEpisode,
  resolveEpisodeLikeCount,
  dramaFavoritedByMe,
  isDramaFavoritePending,
  onToggleDramaFavorite,
  onNotInterested,
  className,
}: PlayImmersiveSidePanelProps) {
  const { t } = useTranslation();
  const isFullscreen = layoutVariant === PlayImmersiveLayoutVariant.Fullscreen;
  const tabTriggerClassName = cn(
    'px-0 text-base leading-6 data-active:text-foreground',
    'after:h-[3px] after:rounded-sm after:bg-foreground',
    isFullscreen ? 'pt-0 pb-[5px] after:w-4' : 'after:w-16',
  );

  const handleTabChange = (value: string | number | null) => {
    if (typeof value !== 'string' || !isSideTab(value)) {
      return;
    }

    onTabChange(value);
  };

  return (
    <aside
      data-play-immersive-side-panel=""
      className={cn(
        'flex h-full min-h-0 flex-col',
        isFullscreen
          ? 'w-[343px] min-w-[343px]'
          : 'w-full min-w-[343px] max-w-[660px]',
        'overflow-hidden',
        className,

        // Visual — Figma 80:98370 / 31:10498 Page&Sheet/secondary
        'bg-secondary',
      )}
    >
      <Tabs
        value={tab}
        onValueChange={handleTabChange}
        className={cn('flex min-h-0 flex-1 flex-col gap-0 bg-secondary')}
      >
        <header
          className={cn(
            'flex w-full shrink-0 items-center justify-between gap-4',
            isFullscreen
              ? 'border-b-[0.5px] border-border px-4 pt-1.5'
              : 'border-b border-border px-4 pt-1.5',
          )}
        >
          <TabsList
            variant="line"
            className={cn(
              'h-auto min-w-0 flex-1 justify-start gap-5',
              isFullscreen && 'pt-2.5',
            )}
          >
            <TabsTrigger
              value={PlayImmersiveSideTab.Comment}
              className={tabTriggerClassName}
            >
              {t('评论')}
            </TabsTrigger>
            {!isShortVideo ? (
              <>
                <TabsTrigger
                  value={PlayImmersiveSideTab.Drama}
                  className={tabTriggerClassName}
                >
                  {t('短剧')}
                </TabsTrigger>
                {SHOW_DEV_ONLY_UI ? (
                  <TabsTrigger
                    value={PlayImmersiveSideTab.Character}
                    className={tabTriggerClassName}
                  >
                    {t('角色IP')}
                  </TabsTrigger>
                ) : null}
              </>
            ) : null}
          </TabsList>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label={t('关闭')}
            className="relative z-20 size-6 shrink-0 rounded-none bg-secondary p-0"
          >
            <IconX className="size-6" />
          </Button>
        </header>

        <TabsContent
          value={PlayImmersiveSideTab.Comment}
          className={cn(
            'mt-0 flex min-h-0 flex-1 flex-col overflow-hidden p-0',
          )}
        >
          {episodeApiId || targetCommentId ? (
            <PlayCommentsPanel
              dramaId={dramaId}
              currentEpisode={currentEpisode}
              episodeApiId={episodeApiId ?? ''}
              contentType={
                isShortVideo ? PlayFeedContentType.ShortVideo : undefined
              }
              commentCount={commentCount}
              creatorUserId={creatorUserId}
              enabled={tab === PlayImmersiveSideTab.Comment}
              targetCommentId={targetCommentId}
            />
          ) : (
            <p className="p-4 text-sm text-muted-foreground">{t('暂无评论')}</p>
          )}
        </TabsContent>

        {!isShortVideo ? (
          <>
            <TabsContent
              value={PlayImmersiveSideTab.Drama}
              className={cn(
                'mt-0 flex min-h-0 flex-1 flex-col overflow-hidden',
              )}
            >
              <PlayImmersiveDramaTab
                layoutVariant={layoutVariant}
                dramaId={dramaId}
                dramaInfo={dramaInfo}
                totalEpisodes={totalEpisodes}
                episodes={episodes}
                currentEpisode={currentEpisode}
                isActive={tab === PlayImmersiveSideTab.Drama}
                dramaFavoritedByMe={dramaFavoritedByMe}
                isDramaFavoritePending={isDramaFavoritePending}
                creatorUserId={creatorUserId}
                onToggleDramaFavorite={onToggleDramaFavorite}
                onNotInterested={onNotInterested}
                onSelectEpisode={onSelectEpisode}
                resolveEpisodeLikeCount={resolveEpisodeLikeCount}
              />
            </TabsContent>

            {SHOW_DEV_ONLY_UI ? (
              <TabsContent
                value={PlayImmersiveSideTab.Character}
                className={cn(
                  'mt-0 flex min-h-0 flex-1 flex-col overflow-hidden',
                )}
              >
                <PlayImmersiveCharacterTab roles={roles} />
              </TabsContent>
            ) : null}
          </>
        ) : null}
      </Tabs>
    </aside>
  );
}
