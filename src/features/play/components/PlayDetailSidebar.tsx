import type { DramaInfo } from '@/api/__generated__/story/model/dramaInfo';
import type { DramaPlayResponse } from '@/api/__generated__/story/model/dramaPlayResponse';
import { PlayDetailDramaMeta } from '@/features/play/components/PlayDetailDramaMeta';
import { PlayEngagementBar } from '@/features/play/components/PlayEngagementBar';
import { PlayEpisodesSidebar } from '@/features/play/components/PlayEpisodesSidebar';
import { cn } from '@/utils';

type PlayDetailSidebarProps = {
  className?: string;
  dramaId: string;
  dramaInfo?: DramaInfo;
  totalEpisodes: number;
  currentEpisode: number;
  episodeApiId?: string;
  episodePlay?: DramaPlayResponse;
  creatorUserId?: string;
  onOpenRating: () => void;
  onSelectEpisode: (episode: number) => void;
};

export function PlayDetailSidebar({
  className,
  dramaId,
  dramaInfo,
  totalEpisodes,
  currentEpisode,
  episodeApiId,
  episodePlay,
  creatorUserId,
  onOpenRating,
  onSelectEpisode,
}: PlayDetailSidebarProps) {
  return (
    <aside
      className={cn(
        'flex min-h-0 w-full flex-col gap-2.5',
        'lg:w-[379px] lg:self-start',
        className,
      )}
    >
      <div className={cn('flex flex-col gap-4 rounded-xl bg-card p-4')}>
        <PlayDetailDramaMeta
          dramaInfo={dramaInfo}
          totalEpisodes={totalEpisodes}
        />
        <PlayEngagementBar
          dramaId={dramaId}
          currentEpisode={currentEpisode}
          episodeApiId={episodeApiId}
          episodePlay={episodePlay}
          dramaTitle={dramaInfo?.title}
          favoriteCount={
            (
              episodePlay as
                | (DramaPlayResponse & { favoriteCount?: number })
                | undefined
            )?.favoriteCount
          }
          avgRating={dramaInfo?.avgRating}
          totalRatingUserCount={dramaInfo?.totalRatingUserCount}
          creatorUserId={creatorUserId}
          onOpenRating={onOpenRating}
          layout="sidebar"
        />
      </div>
      <div
        className={cn(
          'flex min-h-0 flex-col gap-4 overflow-hidden rounded-xl bg-card p-4',
        )}
      >
        <PlayEpisodesSidebar
          totalEpisodes={totalEpisodes}
          selectedEpisode={currentEpisode}
          onSelectEpisode={onSelectEpisode}
        />
      </div>
    </aside>
  );
}
