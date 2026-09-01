export type DramaFlowEpisode = {
  clientId: string;
  episodeNo: number;
  title?: string;
  description?: string;
  videoObjectKey?: string;
  /** 不参与提交 */
  localFileName?: string;
  /** 不参与提交：上传成功时写入，用于稿面「(23M)」体积回显 */
  localFileSizeBytes?: number;
  /** 不参与提交：本地读取的视频时长（秒） */
  localVideoDurationSeconds?: number;
  /** 不参与提交：本地读取的视频宽度（提交时映射为 API width） */
  localVideoWidth?: number;
  /** 不参与提交：本地读取的视频高度（提交时映射为 API height） */
  localVideoHeight?: number;
  /**
   * 不参与提交：本地视频首帧 JPEG blob（仅当前会话有效）。
   * 刷新草稿后无 blob 时展示历史视频占位（灰色底 + 视频图标 + Tooltip）。
   */
  localPosterObjectUrl?: string;

  /** Edit Mode Only: 原剧集实体 ID */
  id?: number;
  /** Edit Mode Only: 原视频地址，仅展示用 */
  originalVideoUrl?: string;
};

export type DramaFlowRole = {
  clientId: string;
  name?: string;
  bio?: string;
  avatarObjectKey?: string;
  sortNo?: number;
  actorCollectionId?: string;
  /** 不参与提交：头像预览 URL */
  avatarSrc?: string;

  /** Edit Mode Only: 原角色实体 ID */
  roleId?: number;
  /** Edit Mode Only: 原头像地址，仅展示用 */
  originalAvatarUrl?: string;
};

export type DramaFlowDocument = {
  uploadSessionId?: number;
  title?: string;
  description?: string;
  coverObjectKey?: string;
  bannerObjectKey?: string;
  /** 标签 id 在草稿与表单中一律为字符串，避免 Snowflake 精度问题 */
  tagIds?: string[];
  episodes?: DramaFlowEpisode[];
  roles?: DramaFlowRole[];

  /** Edit Mode Only: 剧集 ID */
  id?: number;
  /** Edit Mode Only: 上架时间（毫秒），用于角色 IP 绑定 7 天窗口 */
  onlineAt?: number;
  /** Edit Mode Only: 原封面地址，仅展示用 */
  originalCoverUrl?: string;
  /** Edit Mode Only: 原海报地址，仅展示用 */
  originalBannerUrl?: string;
};

export type DramaFlowRoleItem = {
  id: string; // 对应 clientId
  name: string;
  bio: string;
  avatarObjectKey?: string;
  actorCollectionId?: string;
  avatarSrc?: string;
  // Edit mode
  roleId?: number;
  originalAvatarUrl?: string;
};

/**
 * 本地持久化恢复或新建草稿时：无剧集或空数组则补一集空壳，避免水合后列表被清空闪烁。
 */
export function ensureFlowEpisodesForHydrate(
  episodes: DramaFlowEpisode[] | undefined,
): DramaFlowEpisode[] {
  if (episodes !== undefined && episodes.length > 0) {
    return episodes;
  }

  return [
    {
      clientId: crypto.randomUUID(),
      episodeNo: 1,
    },
  ];
}

export function createEmptyDramaFlowDocument(): DramaFlowDocument {
  return {
    episodes: ensureFlowEpisodesForHydrate(undefined),
  };
}

export function createRoleItemFromFlowRole(
  role: DramaFlowRole,
): DramaFlowRoleItem {
  return {
    id: role.clientId,
    name: role.name ?? '',
    bio: role.bio ?? '',
    avatarObjectKey: role.avatarObjectKey,
    actorCollectionId: role.actorCollectionId,
    avatarSrc: role.avatarSrc,
    roleId: role.roleId,
    originalAvatarUrl: role.originalAvatarUrl,
  };
}

export function createRoleFromRoleItem(
  item: DramaFlowRoleItem,
  sortNo: number,
): DramaFlowRole {
  return {
    clientId: item.id,
    name: item.name,
    bio: item.bio,
    sortNo,
    avatarObjectKey: item.avatarObjectKey,
    actorCollectionId: item.actorCollectionId,
    avatarSrc: item.avatarSrc,
    roleId: item.roleId,
    originalAvatarUrl: item.originalAvatarUrl,
  };
}
