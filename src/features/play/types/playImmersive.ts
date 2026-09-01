import type { FeedItemResponse } from '@/api/__generated__/recommend/model/feedItemResponse';

export enum PlayImmersiveMode {
  Feed = 'feed',
  Drama = 'drama',
}

export enum PlayImmersiveLayoutVariant {
  Embedded = 'embedded',
  Fullscreen = 'fullscreen',
}

export enum PlayFeedContentType {
  DramaEpisode = 'drama_episode',
  ShortVideo = 'short_video',
}

export enum PlayImmersiveSideTab {
  Comment = 'comment',
  Drama = 'drama',
  Character = 'character',
}

export enum PlayPlaylistSource {
  Theater = 'theater',
  History = 'history',
  Profile = 'profile',
  Search = 'search',
  Creation = 'creation',
}

/** 搜索 / 个人作品 / 创作管理：按入口列表翻作品，而不是翻本剧上下集 */
export function isWorkListPlaylistSource(source?: PlayPlaylistSource): boolean {
  return (
    source === PlayPlaylistSource.Search ||
    source === PlayPlaylistSource.Profile ||
    source === PlayPlaylistSource.History ||
    source === PlayPlaylistSource.Creation
  );
}

/**
 * 公共沉浸播放器列表项。推荐 Feed 传当前列表；剧场点进单部剧只传当前剧。
 * Feed 模式上下键翻列表；Drama 默认上下键翻集；搜索 / 个人作品 / 创作管理队列多条时翻作品。
 * `feed` 为推荐流原对象：翻页直接播 mediaAccessUrl，不打短剧详情 / 分集列表。
 */
export type PlayImmersiveItem = {
  dramaId: string;
  episodeNo?: number;
  contentType?: string;
  episodeId?: string;
  feed?: FeedItemResponse;
};

export type RecommendPlaybackScope = {
  auth: string;
  language: string;
};

/**
 * 公共沉浸播放器入参：父层持有列表，本组件只消费当前项并回调翻页。
 */
export type PlayImmersiveViewProps = {
  mode: PlayImmersiveMode;
  layoutVariant: PlayImmersiveLayoutVariant;
  items: PlayImmersiveItem[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  /** 列表仍有下一页时，翻到末尾仍可点下一条并触发 onLoadMore */
  hasMore?: boolean;
  /** 距末尾 3 条或点末条下一条时，由父层 fetchNextPage */
  onLoadMore?: () => void;
  /** 列表播放到最后一条且没有下一页时，从第一条继续 */
  loop?: boolean;
  initialSideTab?: PlayImmersiveSideTab;
  targetCommentId?: string;
  /** 推荐流「不感兴趣」：跳过当前项 */
  onNotInterested?: () => void;
  /** 路由显式 autoplay=1：仅覆盖这次入口的初始恢复 */
  explicitAutoplay?: boolean;
  recommendSessionScope?: RecommendPlaybackScope;
  /**
   * 短视频等不走 drama media hook 的路径：由父层告知转码中，
   * 以展示封面底 + 转码文案，而非纯黑早退。
   */
  isMediaTranscodingPending?: boolean;
};
