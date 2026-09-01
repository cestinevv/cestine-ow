import { useQueries } from '@tanstack/react-query';
import { useMemo } from 'react';

import type { DramaListItemResponse } from '@/api/__generated__/story/model/dramaListItemResponse';
import type { DramaStatisticsResponse } from '@/api/legacy/storyLegacyTypes';
import {
  getPlayDramaDetail,
  getPlayDramaDetailQueryKey,
} from '@/features/play/playDramaApi';
import {
  getPlayDramaListItemCreatorUserId,
  unwrapOrvalPayload,
} from '@/features/play/playFormat';
import {
  mergeTheaterBannerWithDramaDetail,
  type PlayTheaterBannerItem,
} from '@/features/play/types/playTheaterBannerItem';

/**
 * 从剧集列表条目合并 Banner 展示字段。
 * 列表接口已包含 tags / creatorName / avgRating / totalHeatValue / actorCollections 等
 * 所有 Figma 需要的字段，优先从此处取值，以 config 里的值做兜底。
 */
function mergeTheaterBannerWithListItem(
  item: PlayTheaterBannerItem,
  listItem: DramaListItemResponse,
): PlayTheaterBannerItem {
  return {
    ...item,
    tags: listItem.tags ?? item.tags,
    totalEpisodes: listItem.totalEpisodes ?? item.totalEpisodes,
    creatorName: listItem.creatorName?.trim() ?? item.creatorName,
    creatorUserId:
      getPlayDramaListItemCreatorUserId(listItem) ?? item.creatorUserId,
    // 优先 totalCompletedViewCount（完播数），其次 totalPlayCount
    totalPlayCount:
      listItem.totalCompletedViewCount ??
      listItem.totalPlayCount ??
      item.totalPlayCount,
    totalHeatValue: listItem.totalHeatValue ?? item.totalHeatValue,
    avgRating: listItem.avgRating ?? item.avgRating,
    actorCollections: listItem.actorCollections ?? item.actorCollections,
    badge: listItem.badge ?? item.badge,
  };
}

/**
 * 为 Banner 条目补全展示字段（tags / creatorName / 评分 / 角色头像等）：
 * 1. 优先从已加载的剧集列表数据（listItems）合并，零额外请求。
 * 2. 下方列表区仍 pending 时不发起剧详情，避免与 tags/list 抢连接。
 * 3. 列表区就绪后，对仍未覆盖的剧按需拉取剧详情做兜底。
 */
export function useTheaterBannerEnrichment(
  bannerItems: PlayTheaterBannerItem[],
  listItems: DramaListItemResponse[],
  /** 为 true 时不发起 drama detail（通常等于下方 tags+list 首屏 loading） */
  deferDetailFetch: boolean,
) {
  // 按 dramaId 建索引，O(1) 查找
  const listItemsByDramaId = useMemo(() => {
    const map = new Map<string, DramaListItemResponse>();
    for (const listItem of listItems) {
      if (listItem.dramaId !== undefined) {
        map.set(String(listItem.dramaId), listItem);
      }
    }
    return map;
  }, [listItems]);

  // 识别哪些 banner 剧在列表当前分页中找不到
  const missingDramaIds = useMemo(
    () =>
      new Set(
        bannerItems
          .filter((item) => !listItemsByDramaId.has(item.dramaId))
          .map((item) => item.dramaId),
      ),
    [bannerItems, listItemsByDramaId],
  );

  // 列表区未完成前不打 drama detail，避免与 tags / list 抢连接池
  const dramaDetailQueries = useQueries({
    queries: bannerItems.map((item) => ({
      queryKey: getPlayDramaDetailQueryKey(item.dramaId),
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        getPlayDramaDetail(item.dramaId, { signal }),
      enabled: !deferDetailFetch && missingDramaIds.has(item.dramaId),
      retry: false,
      staleTime: 5 * 60 * 1000,
    })),
  });

  const enrichedItems = useMemo(
    () =>
      bannerItems.map((item, index) => {
        const listItem = listItemsByDramaId.get(item.dramaId);

        if (listItem) {
          // 已在剧列表中：直接从列表数据合并，无额外请求
          return mergeTheaterBannerWithListItem(item, listItem);
        }

        // banner 剧不在当前列表分页：用剧详情接口结果做兜底
        const dramaDetail =
          unwrapOrvalPayload<DramaStatisticsResponse>(
            dramaDetailQueries[index]?.data,
          ) ?? undefined;
        return mergeTheaterBannerWithDramaDetail(item, dramaDetail);
      }),
    [bannerItems, listItemsByDramaId, dramaDetailQueries],
  );

  return { enrichedItems };
}
