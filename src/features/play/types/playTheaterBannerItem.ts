import type { ActorCollectionInfoResponse } from '@/api/__generated__/story/model/actorCollectionInfoResponse';
import { readSnowflakeId } from '@/utils/snowflakeId';

/** Admin config key: `banner` */
export type TheaterBannerConfig = {
  enabled?: boolean;
  autoplayIntervalMs?: number;
  items: TheaterBannerConfigItem[];
};

/**
 * Admin 配置的 Banner 条目（展示信息由运营侧完整提供，前端不拉 detail 补全）。
 */
export type TheaterBannerConfigItem = {
  dramaId: string;
  sortOrder: number;
  title: string;
  description?: string;
  badge?: string;
  bannerUrl: string;
  thumbUrl?: string;
  previewHlsUrl?: string;
  previewVideoUrl?: string;
  tags?: string[];
  totalEpisodes?: number;
  creatorName?: string;
  creatorUserId?: string;
  totalPlayCount?: number;
  totalHeatValue?: number;
  avgRating?: number;
  totalRatingUserCount?: number;
  favoriteCount?: number;
  likeCount?: number;
  commentCount?: number;
  actorAvatarUrls?: string[];
  actorCollections?: ActorCollectionInfoResponse[];
  onlineAt?: number;
  offlineAt?: number;
};

/** 剧场 Banner 轮播展示项 */
export type PlayTheaterBannerItem = {
  dramaId: string;
  title: string;
  description?: string;
  badge?: string;
  bannerUrl: string;
  thumbUrl?: string;
  previewHlsUrl?: string;
  previewVideoUrl?: string;
  tags?: string[];
  totalEpisodes?: number;
  creatorName?: string;
  creatorUserId?: string;
  totalPlayCount?: number;
  totalHeatValue?: number;
  avgRating?: number;
  totalRatingUserCount?: number;
  favoriteCount?: number;
  likeCount?: number;
  commentCount?: number;
  actorCollections?: ActorCollectionInfoResponse[];
  sortOrder?: number;
};

function readConfigString(
  row: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = row[key];
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function readConfigStringList(
  row: Record<string, unknown>,
  key: string,
): string[] | undefined {
  const value = row[key];
  if (!Array.isArray(value)) {
    return undefined;
  }

  const list = value
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  return list.length > 0 ? list : undefined;
}

function readConfigNumber(
  row: Record<string, unknown>,
  key: string,
): number | undefined {
  const value = row[key];
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : undefined;
}

export function parseTheaterBannerConfig(
  raw: unknown,
): TheaterBannerConfig | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const obj = raw as Record<string, unknown>;
  const enabled = obj.enabled !== false;
  const autoplayIntervalMs = readConfigNumber(obj, 'autoplayIntervalMs');

  const itemsRaw = obj.items;
  if (!Array.isArray(itemsRaw)) {
    return { enabled, autoplayIntervalMs, items: [] };
  }

  const items: TheaterBannerConfigItem[] = [];

  for (const entry of itemsRaw) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }

    const row = entry as Record<string, unknown>;
    const dramaIdRaw = row.dramaId;
    const dramaId =
      (typeof dramaIdRaw === 'string' || typeof dramaIdRaw === 'number'
        ? readSnowflakeId(dramaIdRaw)
        : undefined) ?? readConfigString(row, 'dramaId');
    const title =
      readConfigString(row, 'title') ?? readConfigString(row, 'titleOverride');
    const bannerUrl = readConfigString(row, 'bannerUrl');

    if (!dramaId || !title || !bannerUrl) {
      continue;
    }

    const actorCollections =
      parseConfigActorCollections(row) ??
      readConfigStringList(row, 'actorAvatarUrls')?.map((avatarUrl) => ({
        actorCollectionAvatar: avatarUrl,
      }));

    items.push({
      dramaId,
      sortOrder: readConfigNumber(row, 'sortOrder') ?? items.length,
      title,
      description:
        readConfigString(row, 'description') ??
        readConfigString(row, 'descriptionOverride'),
      badge: readConfigString(row, 'badge'),
      bannerUrl,
      thumbUrl: readConfigString(row, 'thumbUrl'),
      previewHlsUrl: readConfigString(row, 'previewHlsUrl'),
      previewVideoUrl: readConfigString(row, 'previewVideoUrl'),
      tags: readConfigStringList(row, 'tags'),
      totalEpisodes: readConfigNumber(row, 'totalEpisodes'),
      creatorName: readConfigString(row, 'creatorName'),
      creatorUserId: readConfigSnowflakeId(row.creatorUserId ?? row.userId),
      totalPlayCount: readConfigNumber(row, 'totalPlayCount'),
      totalHeatValue: readConfigNumber(row, 'totalHeatValue'),
      avgRating: readConfigNumber(row, 'avgRating'),
      totalRatingUserCount: readConfigNumber(row, 'totalRatingUserCount'),
      favoriteCount: readConfigNumber(row, 'favoriteCount'),
      likeCount: readConfigNumber(row, 'likeCount'),
      commentCount: readConfigNumber(row, 'commentCount'),
      actorAvatarUrls: actorCollections
        ?.map((actor) => actor.actorCollectionAvatar)
        .filter((avatar): avatar is string => Boolean(avatar)),
      actorCollections,
      onlineAt: readConfigNumber(row, 'onlineAt'),
      offlineAt: readConfigNumber(row, 'offlineAt'),
    });
  }

  items.sort((a, b) => a.sortOrder - b.sortOrder);

  return { enabled, autoplayIntervalMs, items };
}

export function isBannerConfigItemActive(
  item: TheaterBannerConfigItem,
  now = Date.now(),
): boolean {
  if (item.onlineAt !== undefined && now < item.onlineAt) {
    return false;
  }

  if (item.offlineAt !== undefined && now >= item.offlineAt) {
    return false;
  }

  return true;
}

function parseConfigActorCollections(
  row: Record<string, unknown>,
): ActorCollectionInfoResponse[] | undefined {
  // 兼容新格式 roles 字段（admin-fe 写入）与旧格式 actorCollections 字段
  const raw = row.actorCollections ?? row.roles;
  if (!Array.isArray(raw)) {
    return undefined;
  }

  const out: ActorCollectionInfoResponse[] = [];

  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }

    const actor = entry as Record<string, unknown>;
    const actorCollectionId = readConfigSnowflakeId(
      actor.actorCollectionId ?? actor.id ?? actor.actorId,
    );
    const actorCollectionName =
      readConfigString(actor, 'actorCollectionName') ??
      readConfigString(actor, 'name') ??
      readConfigString(actor, 'nickname');
    const actorCollectionAvatar =
      readConfigString(actor, 'actorCollectionAvatar') ??
      readConfigString(actor, 'avatarUrl') ??
      readConfigString(actor, 'avatar_url') ??
      readConfigString(actor, 'avatar');
    const computingPower = readConfigNumber(actor, 'computingPower');

    if (
      !actorCollectionId &&
      !actorCollectionName &&
      !actorCollectionAvatar &&
      computingPower === undefined
    ) {
      continue;
    }

    out.push({
      actorCollectionId: actorCollectionId as unknown as number,
      actorCollectionName,
      actorCollectionAvatar,
      computingPower,
    });
  }

  return out.length > 0 ? out : undefined;
}

function readConfigSnowflakeId(value: unknown): string | undefined {
  return typeof value === 'string' || typeof value === 'number'
    ? readSnowflakeId(value)
    : undefined;
}

export function mergeTheaterBannerWithDramaDetail(
  item: PlayTheaterBannerItem,
  dramaDetail?: {
    dramaInfo?: {
      tags?: string[];
      creatorName?: string;
      creatorUserId?: number | string;
      userInfo?: { userId?: number | string };
      creator?: { userId?: number | string };
      avgRating?: number;
      totalRatingUserCount?: number;
      favoriteCount?: number;
      totalCompletedViewCount?: number;
      totalHeatValue?: number;
      badge?: string;
    };
    totalEpisodes?: number;
    playbackRule?: { totalEpisodes?: number };
  },
): PlayTheaterBannerItem {
  const dramaInfo = dramaDetail?.dramaInfo;
  const detailTotalEpisodes =
    dramaDetail?.totalEpisodes ?? dramaDetail?.playbackRule?.totalEpisodes;

  return {
    ...item,
    tags: dramaInfo?.tags ?? item.tags,
    totalEpisodes: detailTotalEpisodes ?? item.totalEpisodes,
    creatorName: dramaInfo?.creatorName?.trim() ?? item.creatorName,
    creatorUserId:
      readConfigSnowflakeId(
        dramaInfo?.creatorUserId ??
          dramaInfo?.userInfo?.userId ??
          dramaInfo?.creator?.userId,
      ) ?? item.creatorUserId,
    totalPlayCount: dramaInfo?.totalCompletedViewCount ?? item.totalPlayCount,
    totalHeatValue: dramaInfo?.totalHeatValue ?? item.totalHeatValue,
    avgRating: dramaInfo?.avgRating ?? item.avgRating,
    totalRatingUserCount:
      dramaInfo?.totalRatingUserCount ?? item.totalRatingUserCount,
    favoriteCount: dramaInfo?.favoriteCount ?? item.favoriteCount,
    badge: dramaInfo?.badge ?? item.badge,
  };
}

export function mapConfigItemToPlayTheaterBannerItem(
  item: TheaterBannerConfigItem,
): PlayTheaterBannerItem {
  const actorCollections =
    item.actorCollections ??
    item.actorAvatarUrls?.map((avatarUrl) => ({
      actorCollectionAvatar: avatarUrl,
    }));

  return {
    dramaId: item.dramaId,
    title: item.title,
    description: item.description,
    badge: item.badge,
    bannerUrl: item.bannerUrl,
    thumbUrl: item.thumbUrl ?? item.bannerUrl,
    previewHlsUrl: item.previewHlsUrl,
    previewVideoUrl: item.previewVideoUrl,
    tags: item.tags,
    totalEpisodes: item.totalEpisodes,
    creatorName: item.creatorName,
    creatorUserId: item.creatorUserId,
    totalPlayCount: item.totalPlayCount,
    totalHeatValue: item.totalHeatValue,
    avgRating: item.avgRating,
    totalRatingUserCount: item.totalRatingUserCount,
    favoriteCount: item.favoriteCount,
    likeCount: item.likeCount,
    commentCount: item.commentCount,
    actorCollections,
    sortOrder: item.sortOrder,
  };
}

/** 仅当 admin `banner.enabled` 为 true 时返回配置条目，不回退短剧列表 */
export function resolveTheaterBannerItems(
  config: TheaterBannerConfig | null | undefined,
  limit = 10,
): PlayTheaterBannerItem[] {
  if (!config?.enabled || config.items.length === 0) {
    return [];
  }

  const now = Date.now();
  const out: PlayTheaterBannerItem[] = [];

  for (const configItem of config.items) {
    if (!isBannerConfigItemActive(configItem, now)) {
      continue;
    }

    out.push(mapConfigItemToPlayTheaterBannerItem(configItem));

    if (out.length >= limit) {
      break;
    }
  }

  return out;
}
