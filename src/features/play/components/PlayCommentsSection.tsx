import { useTranslation } from 'react-i18next';

import { PlayCommentsPanel } from '@/features/play/components/PlayCommentsPanel';
import { cn } from '@/utils';

type PlayCommentsSectionProps = {
  dramaId: string;
  currentEpisode: number;
  episodeApiId: string;
  commentCount?: number;
  creatorUserId?: string;
  className?: string;
};

export function PlayCommentsSection({
  dramaId,
  currentEpisode,
  episodeApiId,
  commentCount,
  creatorUserId,
  className,
}: PlayCommentsSectionProps) {
  const { t } = useTranslation();

  const heading =
    commentCount !== undefined
      ? t('评论（{{count}}）', { count: commentCount })
      : t('评论');

  return (
    <section
      aria-labelledby="play-detail-comments-heading"
      className={cn('flex flex-col gap-4', className)}
    >
      <h2
        id="play-detail-comments-heading"
        className={cn(
          'text-lg font-bold leading-[26px] tracking-[-0.04px] text-foreground',
        )}
      >
        {heading}
      </h2>
      <PlayCommentsPanel
        dramaId={dramaId}
        currentEpisode={currentEpisode}
        episodeApiId={episodeApiId}
        creatorUserId={creatorUserId}
      />
    </section>
  );
}
