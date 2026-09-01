import Decimal from 'decimal.js';
import type { TFunction } from 'i18next';
import type { FeedItemResponse } from '@/api/__generated__/recommend/model/feedItemResponse';
import type { ActorCollectionInfoResponse } from '@/api/__generated__/story/model/actorCollectionInfoResponse';
import type { DramaEpisodeListItemResponse } from '@/api/__generated__/story/model/dramaEpisodeListItemResponse';
import type { DramaInfo } from '@/api/__generated__/story/model/dramaInfo';
import type { DramaListItemResponse } from '@/api/__generated__/story/model/dramaListItemResponse';
import type { DramaPlayResponse } from '@/api/__generated__/story/model/dramaPlayResponse';
import type { NftInfo } from '@/api/__generated__/story/model/nftInfo';
import type { PageDtoCommentResponse } from '@/api/__generated__/story/model/pageDtoCommentResponse';
import type { PageDtoDramaListItemResponse } from '@/api/__generated__/story/model/pageDtoDramaListItemResponse';
import type {
  ActorCollectionInfo,
  CreatorInfo,
  RoleInfo,
} from '@/api/legacy/storyCompatModels';
import type { DramaStatisticsResponse } from '@/api/legacy/storyLegacyTypes';
import { CONTENT_CONTAINER_PADDING_CLASS } from '@/components/common/ContentContainer';
import { unwrapOrvalPayload } from '@/features/mining/miningFormat';
import { formatDramaNftLabel } from '@/features/narrator/narratorStakeFormat';
import { PLAY_DRAMA_ACTOR_DISPLAY_LIMIT } from '@/features/play/constants/playDramaActorLimit';
import {
  getFeedItemMediaAccessUrl,
  getFeedItemPlaybackType,
} from '@/features/play/playRecommendFeed';
import { formatNumber } from '@/utils/formatNumber';
import { readSnowflakeId } from '@/utils/snowflakeId';

export { unwrapOrvalPayload };

/** Play 模块版心水平留白（与剧场列表、Header 一致） */
export const PLAY_CONTENT_CONTAINER_CLASS = CONTENT_CONTAINER_PADDING_CLASS;

/** 剧场列表卡片列宽：最小 248px（供 JS 与 class 同源；角色卡见 actorPlazaCardGrid） */
export const PLAY_DRAMA_CARD_MIN_WIDTH_PX = 248;

/** 剧场列表桌面 auto-fill 网格单行最多列数 */
export const PLAY_DRAMA_CARD_MAX_COLUMNS = 8;

/** 剧场列表卡片最小宽度（避免创作者名挤压完播/热度/评分） */
export const PLAY_DRAMA_CARD_MIN_WIDTH_CLASS = 'min-w-[248px]';

/**
 * 列表卡片封面宽高比（剧场短剧等：3:4；角色广场见 actorPlazaCardGrid）
 * Tailwind 需完整静态串
 */
export const PLAY_CARD_COVER_ASPECT_CLASS = 'aspect-3/4';

/**
 * 公开剧集搜索 `limit`（与 OpenAPI `/api/mini-drama/public/dramas/search` 一致）。
 * 后端当前 `maximum: 6` 且默认 6，传更大值会 400；需更多结果须后端放宽后再改此常量并重新 orval。
 */
export const PLAY_SEARCH_LIMIT = 6;

/** 剧场 / 游戏我的演员 / 叙事者等仍走断点列数的网格（封顶 5 列） */
export const DRAMA_CARD_GRID_CLASS =
  'grid list-none grid-cols-1 gap-5 p-0 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5';

/**
 * auto-fill 单列模板（剧场短剧；min 对齐 `PLAY_DRAMA_CARD_MIN_WIDTH_PX`，封顶 `PLAY_DRAMA_CARD_MAX_COLUMNS` 列）
 * minmax(max(248px, calc((100% - 3.5rem) / 8)), 1fr)；3.5rem = 7 × gap-2
 */
export const PLAY_THEATER_CARD_GRID_TRACK_CLASS =
  'grid-cols-[repeat(auto-fill,minmax(max(248px,calc((100%-3.5rem)/8)),1fr))]';

/** 剧场列表（桌面 list 等）：248px 起 auto-fill，单行最多 8 列；卡片间距 8px（与 H5 宫格一致） */
export const PLAY_THEATER_LIST_GRID_CLASS =
  'grid w-full list-none grid-cols-[repeat(auto-fill,minmax(max(248px,calc((100%-3.5rem)/8)),1fr))] gap-2 p-0';

/**
 * 最小列宽 248px 时单行剧场卡片约高：封面 aspect-3/4 + 文案区（p-3 + 标题 leading-6 + gap-2 + meta leading-4）
 * 供列表空态 / 容器 minHeight 与一行数据对齐
 */
export const PLAY_THEATER_CARD_ROW_MIN_HEIGHT_PX =
  Math.ceil((PLAY_DRAMA_CARD_MIN_WIDTH_PX * 4) / 3) + 72;

/** 剧场 H5 宫格（2 列；卡片间距 8px；左右净边距随版心 px-2） */
export const PLAY_THEATER_GRID_VIEW_CLASS =
  'grid w-full list-none grid-cols-2 gap-2 p-0';

/** 桌面端覆盖 H5 宫格列数与边距；248px 起 auto-fill，单行最多 8 列；间距保持 8px（`gap-2`） */
export const PLAY_THEATER_GRID_VIEW_DESKTOP_CLASS =
  'md:mx-0 md:grid-cols-[repeat(auto-fill,minmax(max(248px,calc((100%-3.5rem)/8)),1fr))] md:gap-2';

/** 剧场卡片 meta：标签（走 i18n） */
export function formatPlayDramaCardMetaLabel(
  t: TFunction,
  tag: string | undefined,
): string | undefined {
  const trimmedTag = tag?.trim();

  if (!trimmedTag) {
    return undefined;
  }

  return t(trimmedTag, { defaultValue: trimmedTag });
}

/** 与 `DRAMA_CARD_GRID_CLASS` 中 `gap-5` 一致（20px） */
export const DRAMA_CARD_GRID_GAP_PX = 20;

const DRAMA_CARD_GRID_2XL_MIN_WIDTH_PX = 1536;
const DRAMA_CARD_GRID_XL_MIN_WIDTH_PX = 1280;
/** 与 `@theme --breakpoint-lg`（1024.5）对齐 */
const DRAMA_CARD_GRID_LG_MIN_WIDTH_PX = 1024.5;
/** 与 `@theme --breakpoint-md`（768.5）对齐 */
const DRAMA_CARD_GRID_MD_MIN_WIDTH_PX = 768.5;

/** 与 `DRAMA_CARD_GRID_CLASS` 断点列数一致，供 JS 侧轮播/布局对齐 */
export function getDramaCardGridColumnCount(viewportWidth: number): number {
  if (viewportWidth >= DRAMA_CARD_GRID_2XL_MIN_WIDTH_PX) {
    return 5;
  }

  if (viewportWidth >= DRAMA_CARD_GRID_XL_MIN_WIDTH_PX) {
    return 4;
  }

  if (viewportWidth >= DRAMA_CARD_GRID_LG_MIN_WIDTH_PX) {
    return 3;
  }

  if (viewportWidth >= DRAMA_CARD_GRID_MD_MIN_WIDTH_PX) {
    return 2;
  }

  return 1;
}

export const PLAY_THEATER_ACCENT_BORDER_CLASS = 'border-primary';
export const PLAY_THEATER_ACCENT_BG_CLASS = 'bg-primary';

const PLAY_MARK_END = '-1';

/** 路由 / 接口路径使用的短剧雪花 ID（禁止转 number，避免丢精度）。 */
export function parsePlayDramaId(dramaId: string): string | undefined {
  return readSnowflakeId(dramaId);
}

export function getPlayCursorNextPageParam(lastPage: {
  data?: unknown;
}): string | undefined {
  const pageData = unwrapOrvalPayload<
    PageDtoDramaListItemResponse | PageDtoCommentResponse
  >(lastPage);
  if (!pageData?.hasMore) {
    return undefined;
  }
  if (pageData.mark === undefined || pageData.mark === null) {
    return undefined;
  }
  if (String(pageData.mark) === PLAY_MARK_END) {
    return undefined;
  }
  return String(pageData.mark);
}

export function formatPlayCompactCount(
  value: number | string | null | undefined,
): string | undefined {
  const count = coercePlayCount(value);
  if (count === undefined) {
    return undefined;
  }

  if (count >= 10_000) {
    return `${formatNumber(count / 1000, 1).replace(/\.0$/, '')}k`;
  }

  if (count >= 1000) {
    return `${formatNumber(count / 1000, 1).replace(/\.0$/, '')}k`;
  }

  return formatNumber(count, 0);
}

/** 片酬 STORY/h：两位小数向下截断；结果为 0.00 时显示 `<0.01` */
export function formatPlayStoryPerHour(value: number | string): string {
  const label = new Decimal(value)
    .toDecimalPlaces(2, Decimal.ROUND_DOWN)
    .toFixed(2);

  return label === '0.00' ? '<0.01' : label;
}

/** 详情 / 列表作者扩展：OpenAPI 尚未收录的 userInfo / avatarUrl */
type PlayCreatorUserInfoExtras = {
  userId?: number | string;
  nickname?: string;
  avatarUrl?: string;
  followedByMe?: boolean;
};

type PlayDramaListItemCreatorExtras = {
  creatorId?: number | string;
  userId?: number | string;
  creatorUserId?: number | string;
  userInfo?: PlayCreatorUserInfoExtras;
  creator?: CreatorInfo & PlayCreatorUserInfoExtras;
};

type PlayDramaInfoCreatorExtras = {
  userId?: number | string;
  creatorUserId?: number | string;
  followedByMe?: boolean;
  creator?: CreatorInfo & PlayCreatorUserInfoExtras;
  /** 详情作者资料（含 avatarUrl；avatar-xx.png 需回退 Stamp） */
  userInfo?: PlayCreatorUserInfoExtras;
};

type PlayDramaDetailCreatorExtras = {
  userId?: number | string;
  creatorUserId?: number | string;
  userInfo?: PlayCreatorUserInfoExtras;
};

type PlayDramaNftExtras = {
  contractAddress?: string;
};

/** 角色绑定演员：兼容 boundActorCollection / 旧 boundActor 及多种 id/name/avatar 字段 */
type PlayRoleBoundActor = {
  id?: number | string;
  actorCollectionId?: number | string;
  actorId?: number | string;
  assetId?: number | string;
  name?: string;
  actorCollectionName?: string;
  avatar?: string;
  avatarUrl?: string;
  actorCollectionAvatar?: string;
  nft?: NftInfo;
  computingPower?: number;
};

type PlayRoleBoundActorExtras = {
  boundActor?: PlayRoleBoundActor;
  boundActorCollection?: PlayRoleBoundActor;
};

type PlayDramaActorCollectionExtras = {
  id?: number | string;
  actorId?: number | string;
  assetId?: number | string;
  name?: string;
  avatar?: string;
  avatarUrl?: string;
};

export type PlayRoleBoundActorInfo = {
  id?: string;
  name?: string;
  avatar?: string;
  nft?: NftInfo;
  computingPower?: number;
};

export type PlayDramaActorInfo = {
  id?: string;
  name?: string;
  avatar?: string;
  computingPower?: number;
};

/** 详情页主要角色展示（绑定 / 待定统一口径） */
export type PlayRoleDisplayInfo = {
  actorId?: string;
  actorName?: string;
  roleName?: string;
  avatar?: string;
  isPending: boolean;
};

type PlayActorAvatarSource = {
  actorCollectionAvatar?: string;
  avatarUrl?: string;
  avatar?: string;
};

/** 演员头像字段优先级：与列表 actorCollections、详情 boundActor 对齐 */
export function resolvePlayActorAvatar(
  source: PlayActorAvatarSource,
): string | undefined {
  return (
    source.actorCollectionAvatar?.trim() ||
    source.avatarUrl?.trim() ||
    source.avatar?.trim() ||
    undefined
  );
}

export function parsePlayActorCollectionInfo(
  actor: ActorCollectionInfoResponse & PlayDramaActorCollectionExtras,
): PlayDramaActorInfo | undefined {
  const id = readSnowflakeId(
    actor.actorCollectionId ?? actor.id ?? actor.actorId ?? actor.assetId,
  );
  const name = actor.actorCollectionName?.trim() || actor.name?.trim();
  const avatar = resolvePlayActorAvatar({
    actorCollectionAvatar: actor.actorCollectionAvatar,
    avatarUrl: actor.avatarUrl,
    avatar: actor.avatar,
  });
  const computingPower = actor.computingPower;

  if (!id && !name && !avatar && computingPower === undefined) {
    return undefined;
  }

  return { id, name, avatar, computingPower };
}

/** 详情 roles.boundActorCollection → 列表口径 actorCollections（Banner / 卡片复用） */
export function getPlayActorCollectionsFromRoles(
  roles?: RoleInfo[],
): ActorCollectionInfoResponse[] | undefined {
  if (!roles?.length) {
    return undefined;
  }

  const out: ActorCollectionInfoResponse[] = [];

  for (const role of roles) {
    const bound = getPlayRoleBoundActor(role);
    if (!bound) {
      continue;
    }

    out.push({
      actorCollectionId:
        bound.id as ActorCollectionInfoResponse['actorCollectionId'],
      actorCollectionName: bound.name,
      actorCollectionAvatar: bound.avatar,
      computingPower: bound.computingPower,
    });
  }

  return out.length > 0 ? out : undefined;
}

/**
 * 扁平 actorCollections（过渡期详情 / 仅 IP）→ RoleInfo，供角色面板统一消费。
 * 无独立角色名，仅把顶层 IP 字段落到 boundActorCollection。
 */
export function mapActorCollectionToRoleInfo(
  actor: ActorCollectionInfo,
): RoleInfo {
  const id = actor.id ?? actor.actorCollectionId;
  const name = actor.name?.trim() || actor.actorCollectionName?.trim();
  const avatar = resolvePlayActorAvatar({
    actorCollectionAvatar: actor.actorCollectionAvatar,
    avatarUrl: actor.avatarUrl,
    avatar: actor.avatar,
  });

  return {
    boundActorCollection: {
      id,
      name,
      avatar,
      nft: actor.nft,
      computingPower: actor.computingPower,
    },
  };
}

/**
 * 详情角色列表归一化：优先 `roles`（现行短剧详情），兼容过渡期 `actorCollections`。
 * 短视频沉浸页不展示角色 Tab，IP 走 Feed.actors，不经此函数。
 */
export function resolvePlayDetailRoles(
  detail?: Pick<DramaStatisticsResponse, 'roles' | 'actorCollections'> | null,
): RoleInfo[] {
  if (detail?.roles?.length) {
    return detail.roles;
  }

  if (!detail?.actorCollections?.length) {
    return [];
  }

  return detail.actorCollections.map(mapActorCollectionToRoleInfo);
}

export function mergePlayActorCollections(
  primary?: ActorCollectionInfoResponse[],
  fallback?: ActorCollectionInfoResponse[],
): ActorCollectionInfoResponse[] | undefined {
  if (!primary?.length) {
    return fallback;
  }

  if (!fallback?.length) {
    return primary;
  }

  const fallbackById = new Map<string, ActorCollectionInfoResponse>();
  const fallbackByName = new Map<string, ActorCollectionInfoResponse>();

  fallback.forEach((actor) => {
    const id = readSnowflakeId(actor.actorCollectionId);
    const name = actor.actorCollectionName?.trim();
    if (id) {
      fallbackById.set(id, actor);
    }
    if (name) {
      fallbackByName.set(name, actor);
    }
  });

  return primary.map((actor, index) => {
    const id = readSnowflakeId(actor.actorCollectionId);
    const name = actor.actorCollectionName?.trim();
    const matched =
      (id ? fallbackById.get(id) : undefined) ??
      (name ? fallbackByName.get(name) : undefined) ??
      fallback[index];
    const avatar =
      resolvePlayActorAvatar({
        actorCollectionAvatar: actor.actorCollectionAvatar,
      }) ??
      resolvePlayActorAvatar({
        actorCollectionAvatar: matched?.actorCollectionAvatar,
      });

    return {
      actorCollectionId: actor.actorCollectionId ?? matched?.actorCollectionId,
      actorCollectionName:
        actor.actorCollectionName ?? matched?.actorCollectionName,
      actorCollectionAvatar: avatar,
    };
  });
}

/** 详情页短剧 NFT 角标（与叙述者中心一致：DramaNFT# + 合约/mint 地址前 8 位） */
export function getPlayDramaNftLabel(
  dramaInfo?: DramaInfo,
): string | undefined {
  const nft = dramaInfo?.nft;
  if (!nft) {
    return undefined;
  }

  const extended = nft as NftInfo & PlayDramaNftExtras;
  const address =
    extended.contractAddress?.trim() || extended.mintAddress?.trim();

  if (!address) {
    return undefined;
  }

  return formatDramaNftLabel(address);
}

function pickFirstSnowflakeId(
  ...values: Array<number | string | undefined>
): string | undefined {
  for (const value of values) {
    const id = readSnowflakeId(value);
    if (id) {
      return id;
    }
  }

  return undefined;
}

/** 详情 dramaInfo 作者 userId（雪花 ID 保持字符串，避免精度丢失） */
export function getPlayDramaInfoCreatorUserId(
  dramaInfo?: DramaInfo,
): string | undefined {
  if (!dramaInfo) {
    return undefined;
  }

  const extended = dramaInfo as DramaInfo & PlayDramaInfoCreatorExtras;
  return pickFirstSnowflakeId(
    extended.creatorUserId,
    extended.userId,
    extended.userInfo?.userId,
    extended.creator?.userId,
  );
}

export function getPlayDramaInfoCreatorFollowedByMe(
  dramaInfo?: DramaInfo,
): boolean | undefined {
  if (!dramaInfo) {
    return undefined;
  }

  const extended = dramaInfo as DramaInfo & PlayDramaInfoCreatorExtras;
  return extended.followedByMe ?? extended.creator?.followedByMe;
}

/**
 * 详情作者头像 URL（`userInfo.avatarUrl` / `creator.avatarUrl`）。
 * 文件名为 `avatar-xx.png` 时由展示层判为未上传，有 userId 才回退 Stamp。
 */
export function getPlayDramaInfoCreatorAvatarUrl(
  dramaInfo?: DramaInfo,
): string | undefined {
  if (!dramaInfo) {
    return undefined;
  }

  const extended = dramaInfo as DramaInfo & PlayDramaInfoCreatorExtras;
  const raw =
    extended.userInfo?.avatarUrl?.trim() ||
    extended.creator?.avatarUrl?.trim() ||
    undefined;

  return raw || undefined;
}

/** 详情作者昵称（兼容 creatorName / userInfo / creator） */
export function getPlayDramaInfoCreatorName(
  dramaInfo?: DramaInfo,
): string | undefined {
  if (!dramaInfo) {
    return undefined;
  }

  const extended = dramaInfo as DramaInfo & PlayDramaInfoCreatorExtras;
  return (
    dramaInfo.creatorName?.trim() ||
    extended.userInfo?.nickname?.trim() ||
    extended.creator?.nickname?.trim() ||
    undefined
  );
}

/** 列表项作者 userId（公开列表返回 creatorId；保持字符串避免雪花精度丢失） */
export function getPlayDramaListItemCreatorUserId(
  item: DramaListItemResponse,
): string | undefined {
  const extended = item as DramaListItemResponse &
    PlayDramaListItemCreatorExtras;
  return pickFirstSnowflakeId(
    extended.creatorId,
    extended.creatorUserId,
    extended.userId,
    extended.userInfo?.userId,
    extended.creator?.userId,
  );
}

/**
 * 详情接口作者字段可能在 dramaInfo 内，也可能与 dramaInfo 同级；补到 dramaInfo 上供头像使用。
 */
export function attachPlayDramaDetailCreator(
  detail?: DramaStatisticsResponse,
): DramaStatisticsResponse | undefined {
  if (!detail) {
    return undefined;
  }

  const extra = detail as DramaStatisticsResponse &
    PlayDramaDetailCreatorExtras;
  const dramaInfo = extra.dramaInfo as
    | (DramaInfo & PlayDramaInfoCreatorExtras)
    | undefined;
  const userId = pickFirstSnowflakeId(
    dramaInfo?.creatorUserId,
    extra.creatorUserId,
    dramaInfo?.userId,
    extra.userId,
    dramaInfo?.userInfo?.userId,
    extra.userInfo?.userId,
    dramaInfo?.creator?.userId,
  );
  const avatarUrl =
    dramaInfo?.userInfo?.avatarUrl?.trim() ||
    extra.userInfo?.avatarUrl?.trim() ||
    dramaInfo?.creator?.avatarUrl?.trim() ||
    undefined;
  const nickname =
    dramaInfo?.creatorName?.trim() ||
    dramaInfo?.userInfo?.nickname?.trim() ||
    extra.userInfo?.nickname?.trim() ||
    dramaInfo?.creator?.nickname?.trim() ||
    undefined;

  if (!dramaInfo && !userId && !avatarUrl) {
    return detail;
  }

  return {
    ...detail,
    dramaInfo: {
      ...dramaInfo,
      creatorName: nickname ?? dramaInfo?.creatorName,
      creatorUserId: userId,
      userInfo: {
        userId,
        nickname,
        avatarUrl,
      },
      creator: {
        ...dramaInfo?.creator,
        userId: userId as CreatorInfo['userId'],
        nickname: nickname ?? dramaInfo?.creator?.nickname,
        avatarUrl: avatarUrl ?? dramaInfo?.creator?.avatarUrl,
      },
    } as DramaInfo,
  };
}

/**
 * 单集播放响应当前带回扁平 creator*；缺作者时补进 dramaInfo，供信息层头像/关注使用。
 */
export function mergeDramaInfoFromPlayCreator(
  dramaInfo: DramaInfo | undefined,
  play?: DramaPlayResponse,
): DramaInfo | undefined {
  if (!play) {
    return dramaInfo;
  }

  const playUserId = pickFirstSnowflakeId(play.creatorId);
  const playAvatarUrl = play.creatorAvatarUrl?.trim() || undefined;
  const playNickname = play.creatorName?.trim() || undefined;

  if (!playUserId && !playAvatarUrl && !playNickname) {
    return dramaInfo;
  }

  const fallback: DramaInfo = {
    creatorName: playNickname,
    creatorUserId: playUserId,
    userInfo: {
      userId: playUserId,
      nickname: playNickname,
      avatarUrl: playAvatarUrl,
    },
    creator: {
      userId: playUserId as CreatorInfo['userId'],
      nickname: playNickname,
      avatarUrl: playAvatarUrl,
    },
  } as DramaInfo;

  return mergePlayDramaCreator(dramaInfo, fallback);
}

/** 详情缺作者字段时，用 Feed 上的 creatorId / creatorAvatar 补齐 */
export function mergePlayDramaCreator(
  primary?: DramaInfo,
  fallback?: DramaInfo,
): DramaInfo | undefined {
  if (!primary) {
    return fallback;
  }

  if (!fallback) {
    return primary;
  }

  const userId =
    getPlayDramaInfoCreatorUserId(primary) ??
    getPlayDramaInfoCreatorUserId(fallback);
  const avatarUrl =
    getPlayDramaInfoCreatorAvatarUrl(primary) ??
    getPlayDramaInfoCreatorAvatarUrl(fallback);
  const nickname =
    getPlayDramaInfoCreatorName(primary) ??
    getPlayDramaInfoCreatorName(fallback);
  // 收藏数：详情优先，缺省时保留 Feed / 另一侧过渡值
  const favoriteCount =
    readPlayDramaFavoriteCount(primary) ?? readPlayDramaFavoriteCount(fallback);
  const followedByMe =
    getPlayDramaInfoCreatorFollowedByMe(primary) ??
    getPlayDramaInfoCreatorFollowedByMe(fallback);

  const withMergedFeedState = (drama: DramaInfo): DramaInfo => {
    const shouldPatchFavoriteCount =
      favoriteCount !== undefined &&
      readPlayDramaFavoriteCount(drama) === undefined;
    const shouldPatchFollowedByMe =
      followedByMe !== undefined &&
      getPlayDramaInfoCreatorFollowedByMe(drama) === undefined;

    if (!shouldPatchFavoriteCount && !shouldPatchFollowedByMe) {
      return drama;
    }

    return {
      ...drama,
      ...(shouldPatchFavoriteCount
        ? {
            favoriteCount,
            totalFavoriteCount: favoriteCount,
          }
        : {}),
      ...(shouldPatchFollowedByMe ? { followedByMe } : {}),
    } as DramaInfo;
  };

  if (
    getPlayDramaInfoCreatorUserId(primary) &&
    (getPlayDramaInfoCreatorAvatarUrl(primary) || !avatarUrl)
  ) {
    return withMergedFeedState(primary);
  }

  return withMergedFeedState({
    ...primary,
    creatorName: nickname ?? primary.creatorName,
    creatorUserId: userId,
    userInfo: {
      userId,
      nickname,
      avatarUrl,
    },
    creator: {
      ...fallback.creator,
      ...primary.creator,
      userId: userId as CreatorInfo['userId'],
      nickname: nickname ?? primary.creator?.nickname,
      avatarUrl: avatarUrl ?? primary.creator?.avatarUrl,
    },
  } as DramaInfo);
}

function coercePlayCount(
  value: number | string | null | undefined,
): number | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  const n = Number(String(value).trim());
  return Number.isFinite(n) ? n : undefined;
}

/**
 * 短剧整剧收藏数：剧详情 `favoriteCount` / `totalFavoriteCount`。
 * 仅用于短剧 Tab 整剧书签；播放栏 / Feed 用单集 favoriteCount。
 */
export function readPlayDramaFavoriteCount(
  dramaInfo?: {
    favoriteCount?: number;
    totalFavoriteCount?: number;
  } | null,
): number | undefined {
  const raw = dramaInfo?.favoriteCount ?? dramaInfo?.totalFavoriteCount;
  return coercePlayCount(raw);
}

/** 短剧整剧是否已收藏（后端即将回显；生成类型未齐时 runtime 读） */
export function readPlayDramaFavoritedByMe(
  dramaInfo?: object | null,
): boolean | undefined {
  if (!dramaInfo || typeof dramaInfo !== 'object') {
    return undefined;
  }

  if (!('favoritedByMe' in dramaInfo)) {
    return undefined;
  }

  return Boolean((dramaInfo as { favoritedByMe?: boolean }).favoritedByMe);
}

/**
 * 单集 / 短视频详情响应是否自带 `favoriteCount`。
 * 后端补齐前，详情 `favoritedByMe` 可能仍是旧剧级语义；有该字段后才视为单集权威。
 */
export function dramaPlayProvidesEpisodeFavoriteCount(
  raw: object | null | undefined,
): boolean {
  if (!raw || typeof raw !== 'object') {
    return false;
  }

  if (!('favoriteCount' in raw)) {
    return false;
  }

  const value = (raw as { favoriteCount?: unknown }).favoriteCount;
  return value !== undefined && value !== null;
}

type DramaPlayFavoriteFields = {
  favoritedByMe?: boolean;
  favoriteCount?: number;
};

/**
 * 合并详情与 Feed/列表缓存的收藏字段。
 * 详情未带 `favoriteCount` 时保留快照的 favoritedByMe / count，避免剧级残留盖过 Feed。
 */
export function mergeDramaPlayFavoriteFields<T extends DramaPlayFavoriteFields>(
  previous: T | undefined,
  next: T | undefined,
  nextRawHadFavoriteCount: boolean,
): T | undefined {
  if (!next) {
    return previous;
  }

  if (!previous) {
    return next;
  }

  if (nextRawHadFavoriteCount) {
    return {
      ...previous,
      ...next,
      favoritedByMe: next.favoritedByMe,
      favoriteCount: next.favoriteCount ?? previous.favoriteCount,
    };
  }

  return {
    ...previous,
    ...next,
    favoritedByMe: previous.favoritedByMe ?? next.favoritedByMe,
    favoriteCount: previous.favoriteCount ?? next.favoriteCount,
  };
}

/** 剧集详情接口字段兼容（字符串计数、雪花 episodeId 等） */
export function normalizeDramaPlayResponse(
  raw: DramaPlayResponse | undefined,
): DramaPlayResponse | undefined {
  if (!raw) {
    return undefined;
  }

  const episodeIdRaw = raw.episodeId;
  const episodeId =
    episodeIdRaw === undefined || episodeIdRaw === null
      ? undefined
      : String(episodeIdRaw).trim() || undefined;

  const rawWithFavorite = raw as DramaPlayResponse & {
    favoriteCount?: number | string;
  };

  const creatorIdRaw = raw.creatorId;
  const creatorId =
    creatorIdRaw === undefined || creatorIdRaw === null
      ? undefined
      : String(creatorIdRaw).trim() || undefined;

  return {
    ...raw,
    // 雪花 episodeId 运行时用字符串；生成类型仍为 number，此处做边界适配
    episodeId: episodeId as DramaPlayResponse['episodeId'],
    creatorId: creatorId as DramaPlayResponse['creatorId'],
    likeCount: coercePlayCount(raw.likeCount as number | string | undefined),
    commentCount: coercePlayCount(
      raw.commentCount as number | string | undefined,
    ),
    // 生成模型暂无 favoriteCount；Feed / 列表快照会带上，供收藏乐观计数
    favoriteCount: coercePlayCount(rawWithFavorite.favoriteCount),
  } as DramaPlayResponse & { favoriteCount?: number };
}

/** 分集列表项 → 播放响应形状（切集主链路用 list，不再逐集 hit detail） */
export function mapDramaEpisodeListItemToPlayResponse(
  item: DramaEpisodeListItemResponse | undefined,
): DramaPlayResponse | undefined {
  if (!item) {
    return undefined;
  }

  return normalizeDramaPlayResponse({
    dramaId: item.dramaId,
    episodeId: item.episodeId,
    episodeNo: item.episodeNo,
    title: item.title,
    coverUrl: item.coverUrl,
    mediaAccessUrl: item.hlsUrl,
    videoUrl: item.videoUrl,
    likeCount: item.likeCount,
    commentCount: item.commentCount,
    // 列表可能回显剧级收藏数作过渡；favoritedByMe 为单集收藏态。权威 count 在单集详情补齐后
    favoriteCount: item.favoriteCount,
    likedByMe: item.likedByMe,
    favoritedByMe: item.favoritedByMe,
  } as DramaPlayResponse & { favoriteCount?: number });
}

/** 点赞/评论等接口路径使用的 episode 实体 id（保持字符串避免大数精度丢失） */
export function getEpisodeApiIdForRequests(
  normalized?: DramaPlayResponse,
): string | undefined {
  const id = normalized?.episodeId;
  if (id === undefined || id === null) {
    return undefined;
  }
  const s = String(id).trim();
  return s === '' ? undefined : s;
}

/** 热度值展示（>=1w 时缩写为 xw） */
export function formatPlayHeatValue(heatValue?: number): string | undefined {
  if (heatValue === undefined || heatValue === null) {
    return undefined;
  }
  if (!Number.isFinite(heatValue)) {
    return undefined;
  }

  if (heatValue >= 10_000) {
    return `${formatNumber(heatValue / 10_000, 1).replace(/\.0$/, '')}w`;
  }

  return formatNumber(heatValue, 2);
}

export function getPlayDramaActors(
  item: Pick<DramaListItemResponse, 'actorCollections'>,
  limit = PLAY_DRAMA_ACTOR_DISPLAY_LIMIT,
): PlayDramaActorInfo[] {
  const collections = item.actorCollections ?? [];
  const actors: PlayDramaActorInfo[] = [];

  for (const actor of collections) {
    const parsed = parsePlayActorCollectionInfo(
      actor as typeof actor & PlayDramaActorCollectionExtras,
    );
    if (!parsed) {
      continue;
    }
    actors.push(parsed);
    if (actors.length >= limit) {
      break;
    }
  }

  return actors;
}

export function getPlayDramaActorNames(item: DramaListItemResponse): string[] {
  const collections = item.actorCollections ?? [];
  const names: string[] = [];

  for (const actor of collections) {
    const name = actor.actorCollectionName?.trim();
    if (!name) {
      continue;
    }
    names.push(name);
  }

  return names;
}

/** 兼容短剧详情角色绑定演员的新旧字段名（boundActorCollection / boundActor）。 */
export function getPlayRoleBoundActor(
  role: RoleInfo,
): PlayRoleBoundActorInfo | undefined {
  const extended = role as RoleInfo & PlayRoleBoundActorExtras;
  const actor = extended.boundActorCollection ?? extended.boundActor;

  if (!actor) {
    return undefined;
  }

  const id = readSnowflakeId(
    actor.id ?? actor.actorCollectionId ?? actor.actorId ?? actor.assetId,
  );
  const name = actor.name?.trim() || actor.actorCollectionName?.trim();
  const avatar = resolvePlayActorAvatar({
    actorCollectionAvatar: actor.actorCollectionAvatar,
    avatarUrl: actor.avatarUrl,
    avatar: actor.avatar,
  });

  if (!id && !name && !avatar && actor.computingPower === undefined) {
    return undefined;
  }

  return {
    id,
    name,
    avatar,
    nft: actor.nft,
    computingPower: actor.computingPower,
  };
}

/** 详情「主要角色」展示：已绑定用演员名 + 演员 IP 头像；未绑定为待定演员 + 角色头像 */
export function getPlayRoleDisplayInfo(
  role: RoleInfo,
  actorAvatarById?: ReadonlyMap<string, string>,
): PlayRoleDisplayInfo {
  const roleName = role.name?.trim();
  const bound = getPlayRoleBoundActor(role);

  if (bound?.id || bound?.name) {
    const avatar =
      bound.avatar ?? (bound.id ? actorAvatarById?.get(bound.id) : undefined);

    return {
      actorId: bound.id,
      actorName: bound.name,
      roleName,
      avatar,
      isPending: false,
    };
  }

  return {
    roleName,
    avatar: role.avatar?.trim(),
    isPending: true,
  };
}

/**
 * 是否存在可展示的剧集均分。
 * null/undefined/非有限数/≤0 视为无评分（五星制下均分不可能为 0，接口常回 0 表示未评）；
 * 有 totalRatingUserCount 且 ≤0 时同样视为无评分。
 */
export function hasPlayAvgRating(
  avgRating?: number | null,
  totalRatingUserCount?: number | null,
): boolean {
  if (
    avgRating === undefined ||
    avgRating === null ||
    !Number.isFinite(avgRating) ||
    avgRating <= 0
  ) {
    return false;
  }

  if (
    totalRatingUserCount !== undefined &&
    totalRatingUserCount !== null &&
    totalRatingUserCount <= 0
  ) {
    return false;
  }

  return true;
}

export function formatPlayAvgRating(
  avgRating?: number | null,
  totalRatingUserCount?: number | null,
): string | undefined {
  if (!hasPlayAvgRating(avgRating, totalRatingUserCount)) {
    return undefined;
  }

  return Number(avgRating).toFixed(1);
}

/** 列表卡片 / Banner 摘要位：与均分展示口径一致（无评分不展示） */
export function hasPlayAvgRatingForSummary(
  avgRating?: number | null,
  totalRatingUserCount?: number | null,
): boolean {
  return hasPlayAvgRating(avgRating, totalRatingUserCount);
}

export function formatPlayAvgRatingForSummary(
  avgRating?: number | null,
  totalRatingUserCount?: number | null,
): string | undefined {
  return formatPlayAvgRating(avgRating, totalRatingUserCount);
}

export function getRoleAvatarFallback(name?: string): string {
  const trimmed = name?.trim();
  if (!trimmed) {
    return '?';
  }
  return trimmed.slice(0, 1);
}

/** 推荐 Feed 条目 → 信息层 / 互动栏用的 DramaInfo 形状 */
export function mapFeedItemToDramaInfo(item: FeedItemResponse): DramaInfo {
  const drama = item.drama;
  const episode = item.episode;

  return {
    title: drama?.title ?? episode?.title,
    desc: drama?.description ?? episode?.description,
    coverImg: drama?.coverUrl ?? episode?.coverUrl,
    tags: drama?.tags,
    creatorName: item.creatorName,
    followedByMe: item.followedByMe,
    // Feed DramaInfo 无整剧收藏数；episode.favoriteCount 仅作过渡展示，播放栏以单集为准
    favoriteCount: episode?.favoriteCount,
    badge: drama?.badge as DramaInfo['badge'],
    creator: {
      nickname: item.creatorName,
      avatarUrl: item.creatorAvatarUrl,
      userId: item.userId as CreatorInfo['userId'],
    },
    creatorUserId: item.userId,
    userInfo: {
      userId: item.userId,
      nickname: item.creatorName,
      avatarUrl: item.creatorAvatarUrl,
    },
  } as DramaInfo;
}

/** 推荐 Feed 条目 → 播放 / 点赞评论计数用的 DramaPlayResponse 形状 */
export function mapFeedItemToDramaPlayResponse(
  item: FeedItemResponse,
): DramaPlayResponse | undefined {
  const episode = item.episode;

  return normalizeDramaPlayResponse({
    dramaId: item.drama?.dramaId as DramaPlayResponse['dramaId'],
    episodeId: episode?.episodeId as DramaPlayResponse['episodeId'],
    episodeNo: episode?.episodeNo,
    title: episode?.title,
    coverUrl: episode?.coverUrl,
    // 单集 play 仅保留分集简介，勿用整剧 description 回填（播放浮层「第N集」位）
    description: episode?.description,
    mediaAccessUrl: getFeedItemMediaAccessUrl(item),
    playbackType: getFeedItemPlaybackType(item),
    likeCount: episode?.likeCount,
    commentCount: episode?.commentCount,
    // Feed：favoritedByMe 在条目顶层（单集语义）；count 用 episode.favoriteCount
    favoriteCount: episode?.favoriteCount,
    likedByMe: item.likedByMe,
    favoritedByMe: item.favoritedByMe,
    creatorId: item.userId as DramaPlayResponse['creatorId'],
    creatorName: item.creatorName,
    creatorAvatarUrl: item.creatorAvatarUrl,
  } as DramaPlayResponse & { favoriteCount?: number });
}
