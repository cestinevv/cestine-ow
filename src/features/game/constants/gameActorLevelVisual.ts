/** 角色等级角标背景色（Figma 卡片 Lv1–Lv5） */
const GAME_ACTOR_LEVEL_BADGE_SURFACE_CLASS = {
  1: 'bg-[rgba(0,111,255,0.5)]',
  2: 'bg-[rgba(12,168,127,0.5)]',
  3: 'bg-[rgba(207,138,55,0.5)]',
  4: 'bg-[rgba(207,79,91,0.5)]',
  5: 'bg-[rgba(114,68,228,0.5)]',
} as const;

export function getGameActorLevelBadgeSurfaceClass(level: number): string {
  return (
    GAME_ACTOR_LEVEL_BADGE_SURFACE_CLASS[
      level as keyof typeof GAME_ACTOR_LEVEL_BADGE_SURFACE_CLASS
    ] ?? GAME_ACTOR_LEVEL_BADGE_SURFACE_CLASS[1]
  );
}
