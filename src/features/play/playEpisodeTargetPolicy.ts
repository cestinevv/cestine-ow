export type EpisodeTargetStatus =
  | 'idle'
  | 'resolving'
  | 'resolved'
  | 'not-found'
  | 'error';

type ResolveEpisodeTargetStatusArgs = {
  targetEpisodeId?: string;
  resolvedEpisodeNo?: number;
  isPending: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  isError: boolean;
  isFetchNextPageError: boolean;
};

type ShouldFetchNextEpisodePageForTargetArgs = {
  status: EpisodeTargetStatus;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
};

export function resolvePendingEpisodeTargetId(args: {
  routeTargetEpisodeId?: string;
  routeTargetIdentity?: string;
  consumedTargetIdentity?: string;
}): string | undefined {
  if (
    !args.routeTargetEpisodeId ||
    !args.routeTargetIdentity ||
    args.routeTargetIdentity === args.consumedTargetIdentity
  ) {
    return undefined;
  }

  return args.routeTargetEpisodeId;
}

/**
 * episodeId 深链定位状态。
 * not-found 仅在全部分页成功、没有下一页、且未命中目标时成立。
 */
export function resolveEpisodeTargetStatus({
  targetEpisodeId,
  resolvedEpisodeNo,
  isPending,
  isFetchingNextPage,
  hasNextPage,
  isError,
  isFetchNextPageError,
}: ResolveEpisodeTargetStatusArgs): EpisodeTargetStatus {
  if (!targetEpisodeId) {
    return 'idle';
  }

  if (resolvedEpisodeNo !== undefined) {
    return 'resolved';
  }

  if (isError || isFetchNextPageError) {
    return 'error';
  }

  if (isPending || isFetchingNextPage || hasNextPage) {
    return 'resolving';
  }

  return 'not-found';
}

export function shouldFetchNextEpisodePageForTarget({
  status,
  hasNextPage,
  isFetchingNextPage,
}: ShouldFetchNextEpisodePageForTargetArgs): boolean {
  return status === 'resolving' && hasNextPage && !isFetchingNextPage;
}

export function shouldGateExplicitEpisodePlayback(args: {
  status: EpisodeTargetStatus;
  currentEpisode: number;
  resolvedEpisodeNo?: number;
}): boolean {
  switch (args.status) {
    case 'idle':
      return false;
    case 'error':
    case 'resolving':
    case 'not-found':
      return true;
    case 'resolved':
      return args.currentEpisode !== args.resolvedEpisodeNo;
  }
}
