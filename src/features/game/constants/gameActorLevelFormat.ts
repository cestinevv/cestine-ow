import type { TFunction } from 'i18next';

import { formatNumber } from '@/utils';

/** 角色咖位等级 → i18n key（与 init.actorNft.levels.name / 接口 levelName 中文值一致） */
const GAME_ACTOR_LEVEL_NAME_KEYS = {
  1: '群演',
  2: '配角',
  3: '主角',
  4: '巨星',
  5: '顶流',
} as const;

type GameActorLevelNameKey =
  (typeof GAME_ACTOR_LEVEL_NAME_KEYS)[keyof typeof GAME_ACTOR_LEVEL_NAME_KEYS];

const GAME_ACTOR_LEVEL_NAME_KEY_SET: ReadonlySet<string> = new Set(
  Object.values(GAME_ACTOR_LEVEL_NAME_KEYS),
);

function getGameActorLevelNameKey(
  level: number | undefined,
): GameActorLevelNameKey | undefined {
  if (level === undefined) {
    return undefined;
  }

  return GAME_ACTOR_LEVEL_NAME_KEYS[
    level as keyof typeof GAME_ACTOR_LEVEL_NAME_KEYS
  ];
}

/** 配置 / 接口返回的中文咖位名 → i18n key */
function getGameActorLevelNameKeyFromName(
  name: string | undefined,
): GameActorLevelNameKey | undefined {
  const trimmed = name?.trim();
  if (!trimmed || !GAME_ACTOR_LEVEL_NAME_KEY_SET.has(trimmed)) {
    return undefined;
  }

  return trimmed as GameActorLevelNameKey;
}

function resolveGameActorLevelNameKey(
  level: number | undefined,
  levelName: string | undefined,
): GameActorLevelNameKey | undefined {
  return (
    getGameActorLevelNameKey(level) ??
    getGameActorLevelNameKeyFromName(levelName)
  );
}

export function formatGameActorLevelName(
  t: TFunction,
  options: {
    level?: number;
    levelName?: string;
  },
): string | undefined {
  const key = resolveGameActorLevelNameKey(options.level, options.levelName);
  if (key) {
    return t(key);
  }

  const fallback = options.levelName?.trim();
  return fallback || undefined;
}

export function formatCompactThreshold(value: number | undefined): string {
  if (value === undefined) {
    return '-';
  }

  if (value >= 1000) {
    return `${formatNumber(value / 1000, 1)}k`;
  }

  return formatNumber(value, 0);
}
