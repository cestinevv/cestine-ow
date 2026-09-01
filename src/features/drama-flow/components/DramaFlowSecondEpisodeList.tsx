import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  restrictToVerticalAxis,
  restrictToWindowEdges,
} from '@dnd-kit/modifiers';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import type { Control } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import {
  DramaFlowSecondEpisodeRow,
  type EpisodeDescriptionFormValues,
} from '@/features/drama-flow/components/DramaFlowSecondEpisodeRow';
import type { DramaFlowEpisode } from '@/features/drama-flow/types/dramaFlowDocument';
import { cn } from '@/utils';

type EpisodeUploadStatus = 'uploading' | 'failed';

type CreateSecondEpisodeListProps = {
  episodes: DramaFlowEpisode[];
  uploadProgressByClientId?: Record<string, number>;
  uploadStatusByClientId?: Record<string, EpisodeUploadStatus>;
  episodeActionsLocked?: boolean;
  canPreviewVideo?: (clientId: string) => boolean;
  isEpisodeSortable?: (episode: DramaFlowEpisode) => boolean;
  isEpisodeRemovable?: (episode: DramaFlowEpisode) => boolean;
  onRefreshEpisode: (clientId: string) => void;
  onRemove: (id: string) => void;
  onPreviewEpisode?: (clientId: string) => void;
  onReorder: (newEpisodes: DramaFlowEpisode[]) => void;
  onDescriptionChange?: (clientId: string, value: string) => void;
  descriptionControl: Control<EpisodeDescriptionFormValues>;
};

export function DramaFlowSecondEpisodeList({
  episodes,
  uploadProgressByClientId = {},
  uploadStatusByClientId = {},
  episodeActionsLocked = false,
  canPreviewVideo,
  isEpisodeSortable,
  isEpisodeRemovable,
  onRefreshEpisode,
  onRemove,
  onPreviewEpisode,
  onReorder,
  onDescriptionChange,
  descriptionControl,
}: CreateSecondEpisodeListProps) {
  const { t } = useTranslation();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = episodes.findIndex((ep) => ep.clientId === active.id);
      const newIndex = episodes.findIndex((ep) => ep.clientId === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const activeEpisode = episodes[oldIndex];
        const overEpisode = episodes[newIndex];

        if (
          isEpisodeSortable &&
          activeEpisode &&
          overEpisode &&
          (!isEpisodeSortable(activeEpisode) || !isEpisodeSortable(overEpisode))
        ) {
          return;
        }

        onReorder(arrayMove(episodes, oldIndex, newIndex));
      }
    }
  };

  if (episodes.length === 0) {
    return null;
  }

  return (
    <div className={cn('flex w-full flex-col', 'gap-4')}>
      <div className={cn('flex flex-col gap-1.5')}>
        <div className={cn('flex flex-wrap items-baseline gap-1')}>
          <h3 className={cn('text-base leading-6 font-bold text-foreground')}>
            {t('已添加的视频')}
          </h3>
          <span
            className={cn(
              'text-base leading-6 font-normal text-muted-foreground',
            )}
          >
            {t('（{{count}} 个文件）', { count: episodes.length })}
          </span>
        </div>
        <p
          className={cn(
            'text-sm leading-5 font-normal text-muted-foreground',
            'md:text-sm md:leading-5',
          )}
        >
          {t('填写分集描述有助于更精准的流量推荐')}
        </p>
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToVerticalAxis, restrictToWindowEdges]}
      >
        <SortableContext
          items={episodes.map((ep) => ep.clientId)}
          strategy={verticalListSortingStrategy}
        >
          <div className={cn('flex w-full flex-col gap-3')}>
            {episodes.map((ep) => {
              const rowUploadStatus = uploadStatusByClientId[ep.clientId];
              const isUploadingThisEpisode = rowUploadStatus === 'uploading';
              const isUploadFailed = rowUploadStatus === 'failed';
              const rowUploadProgress =
                isUploadingThisEpisode || isUploadFailed
                  ? (uploadProgressByClientId[ep.clientId] ?? 0)
                  : null;

              const sortableDisabled =
                episodeActionsLocked ||
                (isEpisodeSortable ? !isEpisodeSortable(ep) : false);
              const removeDisabled = isEpisodeRemovable
                ? !isEpisodeRemovable(ep)
                : false;

              return (
                <DramaFlowSecondEpisodeRow
                  key={ep.clientId}
                  episode={ep}
                  isUploadingThisEpisode={isUploadingThisEpisode}
                  isUploadFailed={isUploadFailed}
                  uploadProgress={rowUploadProgress}
                  episodeActionsLocked={episodeActionsLocked}
                  sortableDisabled={sortableDisabled}
                  removeDisabled={removeDisabled}
                  canPreviewVideo={canPreviewVideo?.(ep.clientId) ?? false}
                  onRefresh={() => onRefreshEpisode(ep.clientId)}
                  onRemove={() => onRemove(ep.clientId)}
                  onPreview={
                    onPreviewEpisode
                      ? () => onPreviewEpisode(ep.clientId)
                      : undefined
                  }
                  onDescriptionChange={
                    onDescriptionChange
                      ? (value) => onDescriptionChange(ep.clientId, value)
                      : undefined
                  }
                  descriptionControl={descriptionControl}
                  descriptionName={`descriptions.${ep.clientId}`}
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
