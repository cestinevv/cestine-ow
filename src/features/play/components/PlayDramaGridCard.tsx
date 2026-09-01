import type { DramaListItemResponse } from '@/api/__generated__/story/model/dramaListItemResponse';
import { PlayDramaCard } from '@/features/play/components/PlayDramaCard';

type PlayDramaGridCardProps = {
  item: DramaListItemResponse;
  onBeforePlay?: () => void;
};

export function PlayDramaGridCard({
  item,
  onBeforePlay,
}: PlayDramaGridCardProps) {
  return <PlayDramaCard item={item} onBeforePlay={onBeforePlay} />;
}
