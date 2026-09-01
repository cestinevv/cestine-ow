type OpenApiLike = {
  paths?: Record<string, unknown>;
};

type OperationLike = {
  operationId?: string;
};

const SUFFIXED_OPERATION_ID = /^(.+)_(\d+)$/;
const FRONTEND_EXCLUDED_PATHS = new Set([
  '/api/mini-drama/public/dramas/{dramaId}/episodes/{episodeNo}/detail',
  '/api/mini-drama/public/dramas/{dramaId}/episodes/{episodeId}/statistics',
]);

/**
 * 剔除服务间 `/internal` 接口，避免进入前端 Orval 生成产物、污染 operation 命名。
 */
export function filterInternalPaths<T extends OpenApiLike>(spec: T): T {
  if (!spec.paths) {
    return spec;
  }

  for (const path of Object.keys(spec.paths)) {
    if (path === '/internal' || path.startsWith('/internal/')) {
      delete spec.paths[path];
    }
  }

  return spec;
}

/** 剔除后端已取消、前端不得继续生成或调用的剧集接口。 */
export function filterCancelledEpisodePaths<T extends OpenApiLike>(spec: T): T {
  if (!spec.paths) {
    return spec;
  }

  for (const path of FRONTEND_EXCLUDED_PATHS) {
    delete spec.paths[path];
  }

  return spec;
}

function collectOperationIds(spec: OpenApiLike): Set<string> {
  const ids = new Set<string>();

  for (const pathItem of Object.values(spec.paths ?? {})) {
    if (!pathItem || typeof pathItem !== 'object') {
      continue;
    }

    for (const operation of Object.values(pathItem)) {
      if (!operation || typeof operation !== 'object') {
        continue;
      }

      const operationId = (operation as OperationLike).operationId;
      if (operationId) {
        ids.add(operationId);
      }
    }
  }

  return ids;
}

/**
 * 过滤 `/internal` 后，把因冲突留下的 `login_1` / `userInfo_1` 等后缀
 * 在基名空闲时收回为 `login` / `userInfo`，避免 Orval 生成 `useLogin1`。
 */
export function normalizeSuffixedOperationIds<T extends OpenApiLike>(spec: T): T {
  if (!spec.paths) {
    return spec;
  }

  const usedIds = collectOperationIds(spec);

  for (const pathItem of Object.values(spec.paths)) {
    if (!pathItem || typeof pathItem !== 'object') {
      continue;
    }

    for (const operation of Object.values(pathItem)) {
      if (!operation || typeof operation !== 'object') {
        continue;
      }

      const typedOperation = operation as OperationLike;
      const operationId = typedOperation.operationId;
      if (!operationId) {
        continue;
      }

      const match = SUFFIXED_OPERATION_ID.exec(operationId);
      if (!match) {
        continue;
      }

      const baseId = match[1];
      if (!baseId || usedIds.has(baseId)) {
        continue;
      }

      typedOperation.operationId = baseId;
      usedIds.delete(operationId);
      usedIds.add(baseId);
    }
  }

  return spec;
}

/** 前端 Orval 输入统一预处理：去 internal + 收回无冲突的 `_N` operationId。 */
export function prepareFrontendOpenApiSpec<T extends OpenApiLike>(spec: T): T {
  filterInternalPaths(spec);
  filterCancelledEpisodePaths(spec);
  normalizeSuffixedOperationIds(spec);
  return spec;
}
