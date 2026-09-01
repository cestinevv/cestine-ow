import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { DramaEpisodeListItemResponse } from '@/api/__generated__/story/model/dramaEpisodeListItemResponse';
import type { DramaInfo } from '@/api/__generated__/story/model/dramaInfo';
import type { RoleInfo } from '@/api/legacy/storyCompatModels';
import { AppDialog } from '@/components/common/AppDialog';
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

type PlayCommentDialogProps = {
  open: boolean;
  dramaId: string;
  currentEpisode: number;
  episodeApiId: string;
  contentType?: string;
  commentCount?: number;
  creatorUserId?: string;
  targetCommentId?: string;
  dramaInfo?: DramaInfo;
  dramaFavoritedByMe?: boolean;
  isDramaFavoritePending?: boolean;
  roles?: RoleInfo[];
  totalEpisodes: number;
  episodes?: DramaEpisodeListItemResponse[];
  onToggleDramaFavorite?: () => void;
  onSelectEpisode: (episode: number) => void;
  onOpenChange: (open: boolean) => void;
  initialSideTab?: PlayImmersiveSideTab;
};

export function PlayCommentDialog({
  open,
  dramaId,
  currentEpisode,
  episodeApiId,
  contentType,
  commentCount,
  creatorUserId,
  targetCommentId,
  dramaInfo,
  dramaFavoritedByMe,
  isDramaFavoritePending,
  roles,
  totalEpisodes,
  episodes,
  onToggleDramaFavorite,
  onSelectEpisode,
  onOpenChange,
  initialSideTab = PlayImmersiveSideTab.Comment,
}: PlayCommentDialogProps) {
  const { t } = useTranslation();
  const [tab, setTab] = useState(initialSideTab);

  useEffect(() => {
    if (!open) {
      return;
    }

    setTab(initialSideTab);
  }, [initialSideTab, open]);
  const title =
    commentCount !== undefined
      ? t('评论（{{count}}）', { count: commentCount })
      : t('评论');
  const isShortVideo = contentType === PlayFeedContentType.ShortVideo;
  const tabTriggerClassName = cn(
    'h-8 border-0 px-0 pt-0 pb-2 text-base leading-6 font-normal text-muted-foreground',
    'data-active:text-foreground after:top-auto after:right-auto after:bottom-0 after:left-1/2',
    'after:h-[3px] after:w-4 after:-translate-x-1/2 after:rounded-full after:bg-foreground',
  );
  const contentClassName = cn(
    'rounded-t-[16px]',
    '[--app-dialog-height:min(570px,68dvh)] [--app-dialog-max-height:var(--app-dialog-height)]',
    'max-md:[&>[data-slot=dialog-content-scroll]]:pb-0',
    'md:[--app-dialog-height:570px]',
  );
  const bodyClassName =
    'flex h-[calc(var(--app-dialog-height)-66px)] min-h-0 flex-col px-0 pb-0';
  const overlayClassName = cn(
    'bg-transparent supports-backdrop-filter:backdrop-blur-none',
    'md:bg-black/40 md:supports-backdrop-filter:backdrop-blur-xs',
  );

  const handleTabChange = (value: string | number | null) => {
    if (
      value !== PlayImmersiveSideTab.Comment &&
      value !== PlayImmersiveSideTab.Drama &&
      value !== PlayImmersiveSideTab.Character
    ) {
      return;
    }

    setTab(value);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setTab(PlayImmersiveSideTab.Comment);
    }

    onOpenChange(nextOpen);
  };

  const handleSelectEpisode = (episode: number) => {
    onSelectEpisode(episode);
    handleOpenChange(false);
  };

  const commentsPanel = (
    <PlayCommentsPanel
      dramaId={dramaId}
      currentEpisode={currentEpisode}
      episodeApiId={episodeApiId}
      contentType={contentType}
      creatorUserId={creatorUserId}
      enabled={open && tab === PlayImmersiveSideTab.Comment}
      targetCommentId={targetCommentId}
    />
  );

  if (isShortVideo) {
    return (
      <AppDialog
        open={open}
        onOpenChange={handleOpenChange}
        title={title}
        contentClassName={contentClassName}
        overlayClassName={overlayClassName}
        bodyClassName={bodyClassName}
        width={600}
      >
        {commentsPanel}
      </AppDialog>
    );
  }

  return (
    <Tabs value={tab} onValueChange={handleTabChange} className="contents">
      <AppDialog
        open={open}
        onOpenChange={handleOpenChange}
        title={title}
        headerContent={
          <div className="flex w-full flex-col items-center">
            <Button
              type="button"
              variant="ghost"
              className="h-6 w-full rounded-none p-0 hover:bg-transparent"
              aria-label={t('关闭')}
              onClick={() => handleOpenChange(false)}
            >
              <span className="h-1 w-12 rounded-[2px] bg-button-disabled-foreground" />
            </Button>
            <TabsList
              variant="line"
              className="w-auto gap-5 pt-2.5 group-data-horizontal/tabs:h-auto"
            >
              <TabsTrigger
                value={PlayImmersiveSideTab.Comment}
                className={tabTriggerClassName}
              >
                {t('评论')}
              </TabsTrigger>
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
                  {t('角色')}
                </TabsTrigger>
              ) : null}
            </TabsList>
          </div>
        }
        contentClassName={contentClassName}
        overlayClassName={overlayClassName}
        headerClassName="gap-0 px-0 py-0"
        hideCloseButton
        disablePointerDismissal={false}
        width={600}
        bodyClassName={bodyClassName}
      >
        <TabsContent
          value={PlayImmersiveSideTab.Comment}
          className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          {commentsPanel}
        </TabsContent>
        <TabsContent
          value={PlayImmersiveSideTab.Drama}
          className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <PlayImmersiveDramaTab
            layoutVariant={PlayImmersiveLayoutVariant.Fullscreen}
            dramaId={dramaId}
            dramaInfo={dramaInfo}
            totalEpisodes={totalEpisodes}
            episodes={episodes}
            currentEpisode={currentEpisode}
            isActive={open && tab === PlayImmersiveSideTab.Drama}
            dramaFavoritedByMe={dramaFavoritedByMe}
            isDramaFavoritePending={isDramaFavoritePending}
            creatorUserId={creatorUserId}
            onToggleDramaFavorite={onToggleDramaFavorite}
            onSelectEpisode={handleSelectEpisode}
          />
        </TabsContent>
        {SHOW_DEV_ONLY_UI ? (
          <TabsContent
            value={PlayImmersiveSideTab.Character}
            className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden [&>section]:bg-background"
          >
            <PlayImmersiveCharacterTab roles={roles} />
          </TabsContent>
        ) : null}
      </AppDialog>
    </Tabs>
  );
}
