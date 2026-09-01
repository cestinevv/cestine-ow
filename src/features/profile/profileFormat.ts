import type { DramaListItemResponse } from '@/api/__generated__/story/model/dramaListItemResponse';
import type { PageDtoUserProfileUnifiedResponse } from '@/api/__generated__/story/model/pageDtoUserProfileUnifiedResponse';
import type { UserProfileUnifiedResponse } from '@/api/__generated__/story/model/userProfileUnifiedResponse';
import { UserProfileUnifiedResponseType } from '@/api/__generated__/story/model/userProfileUnifiedResponseType';
import type { UserProfileResponse } from '@/api/__generated__/wallet/model/userProfileResponse';
import { unwrapOrvalPayload } from '@/features/mining/miningFormat';
import { readSnowflakeId } from '@/utils/snowflakeId';

/** 路由 / 列表 API 路径用 userId（雪花 ID 保持字符串，禁止转 number） */
export function parseProfileUserId(
  raw: string | number | undefined | null,
): string | undefined {
  return readSnowflakeId(raw);
}

/** 个人中心短剧 / 作品 / 点赞 / 收藏列表每页条数 */
export const PROFILE_LIST_PAGE_SIZE = 20;

/** 列表项 type=SHORT_VIDEO，或 episode.contentType=SHORT_VIDEO：独立短视频 */
export function isProfileShortVideoItem(
  item: UserProfileUnifiedResponse,
): boolean {
  return (
    item.type === UserProfileUnifiedResponseType.SHORT_VIDEO ||
    item.episode?.contentType === 'SHORT_VIDEO'
  );
}

/** 列表项 type=DRAMA_EPISODE：短剧下的某一集 */
export function isProfileDramaEpisodeItem(
  item: UserProfileUnifiedResponse,
): boolean {
  return item.type === UserProfileUnifiedResponseType.DRAMA_EPISODE;
}

/** 列表项 type=DRAMA，或接口返回 drama 且 episode 为空的短剧维度项 */
export function isProfileDramaItem(item: UserProfileUnifiedResponse): boolean {
  if (item.type === UserProfileUnifiedResponseType.DRAMA) {
    return true;
  }

  return Boolean(item.drama) && !item.episode;
}

/** 个人中心播放态：分集 / 短视频看 episode.status，短剧看 drama.status */
export function getProfilePlayStatus(
  item: UserProfileUnifiedResponse,
): string | undefined {
  if (isProfileShortVideoItem(item) || isProfileDramaEpisodeItem(item)) {
    return item.episode?.status ?? item.drama?.status;
  }

  return item.drama?.status ?? item.episode?.status;
}

function isProfileUnifiedPage(
  value: unknown,
): value is PageDtoUserProfileUnifiedResponse {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'list' in value &&
      Array.isArray((value as PageDtoUserProfileUnifiedResponse).list),
  );
}

/** 个人中心分页响应解包：兼容 appAxios / 业务 envelope / mock 直接分页对象 */
export function unwrapProfileUnifiedPage(
  response: { data?: unknown } | undefined,
): PageDtoUserProfileUnifiedResponse | undefined {
  if (!response) {
    return undefined;
  }

  const payload =
    unwrapOrvalPayload<PageDtoUserProfileUnifiedResponse>(response);
  if (isProfileUnifiedPage(payload)) {
    return payload;
  }

  const raw = response.data;
  if (isProfileUnifiedPage(raw)) {
    return raw;
  }

  if (
    raw &&
    typeof raw === 'object' &&
    isProfileUnifiedPage((raw as { data?: unknown }).data)
  ) {
    return (raw as { data: PageDtoUserProfileUnifiedResponse }).data;
  }

  return undefined;
}

/** 个人中心短剧项 → 剧场列表卡 `PlayDramaCard` 所需结构 */
export function mapUserProfileDramaToListItem(
  item: UserProfileUnifiedResponse,
  options?: { creatorNameFallback?: string },
): DramaListItemResponse | undefined {
  const drama = item.drama;
  if (!isProfileDramaItem(item) || !drama) {
    return undefined;
  }

  const creatorName =
    item.creatorName?.trim() || options?.creatorNameFallback?.trim();

  return {
    dramaId: drama.dramaId,
    creatorId: item.userId,
    dramaTitle: drama.title,
    dramaDescription: drama.description,
    dramaCoverUrl: drama.coverUrl,
    tags: drama.tags,
    creatorName: creatorName || undefined,
    creatorAvatarUrl: item.creatorAvatarUrl?.trim() || undefined,
    badge: drama.badge,
    avgRating: drama.avgRating,
    totalEpisodes: drama.totalEpisodes,
    totalPlayCount: drama.totalPlayCount,
    totalCompletedViewCount: drama.totalCompletedViewCount,
    totalHeatValue: drama.totalHeatValue,
    actorCollections: drama.actorCollections,
  };
}

/** 短剧个人中心列表游标：与剧场列表 mark 协议一致 */
export function getProfileCursorNextPageParam(lastPage: {
  data?: unknown;
}): string | undefined {
  const pageData = unwrapProfileUnifiedPage(lastPage);
  if (!pageData?.hasMore) {
    return undefined;
  }
  if (pageData.mark === undefined || pageData.mark === null) {
    return undefined;
  }
  if (String(pageData.mark) === '-1') {
    return undefined;
  }

  return String(pageData.mark);
}

/** 作品卡片时长：episode.durationSec */
export function readProfileWorkDurationSec(
  item: UserProfileUnifiedResponse,
): number | undefined {
  const durationSec = item.episode?.durationSec;

  if (durationSec === undefined || !Number.isFinite(durationSec)) {
    return undefined;
  }

  return durationSec;
}

/** 作品卡片点赞数：episode.likeCount */
export function readProfileWorkLikeCount(
  item: UserProfileUnifiedResponse,
): number | undefined {
  return item.episode?.likeCount;
}

/** 钱包服务 Orval 响应内层 data（与登录接口 unwrap 一致） */
export function unwrapWalletApiData<T>(orvalResponse: {
  data?: unknown;
}): T | undefined {
  const envelope = orvalResponse.data as { data?: T } | undefined;
  return envelope?.data;
}

export function mergeUserProfilePatch(
  current: UserProfileResponse | null,
  patch: Partial<UserProfileResponse>,
): UserProfileResponse {
  return { ...current, ...patch };
}

/**
 * 个人简介提交前清洗：接口正则不接受换行（\n/\r），普通空格可通过。
 * 仅去掉换行并 trim，不压缩词间空格。
 */
export function sanitizeProfileBio(value: string): string {
  return value.replace(/\r\n|\r|\n/g, '').trim();
}

/** 输入过程中只去掉换行，保留空格（含末尾空格）以便继续输入 */
export function normalizeProfileBioInput(value: string): string {
  return value.replace(/\r\n|\r|\n/g, '');
}
