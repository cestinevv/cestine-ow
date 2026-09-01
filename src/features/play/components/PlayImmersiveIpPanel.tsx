import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { PlayBoundActorAvatar } from '@/features/play/components/PlayBoundActorAvatar';
import type { PlayImmersiveIpActor } from '@/features/play/hooks/usePlayImmersiveIpActors';
import { formatPlayStoryPerHour } from '@/features/play/playFormat';
import { cn, SHOW_DEV_ONLY_UI } from '@/utils';

type PlayImmersiveIpPanelProps = {
  actors: PlayImmersiveIpActor[];
  onOpenCharacterTab: () => void;
  className?: string;
};

/**
 * IP 栏相对标题的间距（Figma 80:98276，画板内容高 ~684）。
 * 人数越少栏越矮，需更大间距才能接近稿面「偏画面中部」的观感；
 * 4 人稿面实测栏底到标题约 64–80px；5 人收紧，避免把信息顶出视频区。
 */
export function getPlayImmersiveIpMetaGapClass(actorCount: number): string {
  if (actorCount <= 0) {
    return '';
  }

  if (actorCount === 1) {
    return 'gap-36';
  }

  if (actorCount === 2) {
    return 'gap-28';
  }

  if (actorCount === 3) {
    return 'gap-20';
  }

  if (actorCount === 4) {
    return 'gap-16';
  }

  // 5+
  return 'gap-10';
}

/** 5 人且矮屏时两列，其余单列跟稿 */
const IP_PANEL_TWO_COLUMN_MIN_COUNT = 5;

/**
 * Figma 80:98274 / 80:98276 — IP 头像组。
 * 相对标题文档流；间距按人数分级；仅 5+ 且矮屏两列。
 */
export function PlayImmersiveIpPanel({
  actors,
  onOpenCharacterTab,
  className,
}: PlayImmersiveIpPanelProps) {
  const { t } = useTranslation();

  if (!SHOW_DEV_ONLY_UI || actors.length === 0) {
    return null;
  }

  const allowTwoColumn = actors.length >= IP_PANEL_TWO_COLUMN_MIN_COUNT;

  return (
    <aside
      aria-label={t('绑定演员')}
      className={cn(
        // Layout — 跟标题同列，仅桌面展示
        'pointer-events-auto hidden w-fit max-w-full md:block',
        className,
      )}
    >
      <div
        className={cn(
          // Layout
          'flex flex-col items-start',
          // Spacing — 稿面 p-8 / 项间距 8
          'gap-2 p-2',
          allowTwoColumn &&
            '[@media(max-height:760px)]:gap-1.5 [@media(max-height:760px)]:p-1.5',
          // Visual — Figma 1335:130541：bg black/30 + blur 6 + radius 12
          'rounded-xl bg-theater-ip-glass-surface backdrop-blur-[6px]',
        )}
      >
        <ul
          className={cn(
            'm-0 grid list-none grid-cols-1 gap-2 p-0',
            allowTwoColumn && '[@media(max-height:760px)]:grid-cols-2',
          )}
        >
          {actors.map((actor, index) => {
            const name = actor.actorName ?? actor.roleName ?? '';
            const key = actor.actorId ?? actor.avatar ?? name ?? index;
            const computingPower = actor.computingPower;
            const storyPerHourLabel =
              typeof computingPower === 'number' &&
              Number.isFinite(computingPower)
                ? formatPlayStoryPerHour(computingPower)
                : '--';

            return (
              <li key={key} className="min-w-0">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onOpenCharacterTab}
                  className={cn(
                    'flex h-auto w-full flex-col items-center gap-px rounded-none p-0',
                    'hover:bg-transparent hover:opacity-90',
                  )}
                >
                  <PlayBoundActorAvatar
                    avatar={actor.avatar}
                    name={name}
                    className={cn(
                      allowTwoColumn && '[@media(max-height:760px)]:size-7',
                    )}
                  />
                  <span
                    className={cn(
                      'flex flex-col items-center leading-none whitespace-nowrap',
                    )}
                  >
                    <span
                      className={cn(
                        'text-xs leading-4 font-bold tracking-[0.04px] text-white',
                      )}
                    >
                      {storyPerHourLabel}
                    </span>
                    <span
                      className={cn(
                        'text-[10px] leading-3 tracking-[0.08px]',
                        'text-white/60',
                      )}
                    >
                      STORY/h
                    </span>
                  </span>
                </Button>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
