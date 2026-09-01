import { defineTransformer } from 'orval';

import { prepareFrontendOpenApiSpec } from './filter-internal-paths.js';

/**
 * Recommend OpenAPI tag → 前端稳定生成目录映射。
 * 后端 tag 含中文括号时 Orval 会落盘为难 import 的路径，此处统一为 kebab 目录名。
 */
const RECOMMEND_TAG_ALIASES: Record<string, string> = {
  'Recommend Debug（联调使用）': 'recommend-debug',
  'Recommend Feed': 'recommend-feed',
  'health-controller': 'recommend-health',

  // Orval kebab-case 兼容
  'recommend-debug（联调使用）': 'recommend-debug',
  'recommend-feed': 'recommend-feed',
};

function remapTagName(tag: string): string {
  return RECOMMEND_TAG_ALIASES[tag] ?? tag;
}

function remapOperationTags(tags: string[] | undefined): string[] | undefined {
  if (!tags) {
    return tags;
  }

  return tags.map(remapTagName);
}

function ensureEpisodeMediaFields(spec: {
  components?: {
    schemas?: Record<string, unknown>;
  };
}) {
  const episodeInfo = spec.components?.schemas?.EpisodeInfo;
  if (!episodeInfo || typeof episodeInfo !== 'object') {
    return;
  }

  const schema = episodeInfo as {
    properties?: Record<string, unknown>;
  };
  schema.properties ??= {};
  schema.properties.mediaAccessUrl ??= {
    type: 'string',
    description: '播放地址（HLS / mp4）',
  };
  schema.properties.playbackType ??= {
    type: 'string',
    description: '播放类型，例如 HLS',
  };
}

function ensureDramaCardFields(spec: {
  components?: {
    schemas?: Record<string, unknown>;
  };
}) {
  const dramaInfo = spec.components?.schemas?.DramaInfo;
  if (!dramaInfo || typeof dramaInfo !== 'object') {
    return;
  }

  const schema = dramaInfo as {
    properties?: Record<string, unknown>;
  };
  schema.properties ??= {};
  schema.properties.avgRating ??= {
    type: 'number',
    description: '短剧平均评分；未评分时可能为 0 或不返回',
  };
  schema.properties.totalHeatValue ??= {
    type: 'number',
    description: '短剧热度值',
  };
}

export default defineTransformer((spec) => {
  prepareFrontendOpenApiSpec(spec);
  ensureEpisodeMediaFields(spec);
  ensureDramaCardFields(spec);

  if (spec.tags) {
    for (const tag of spec.tags) {
      if (tag.name) {
        tag.name = remapTagName(tag.name);
      }
    }
  }

  if (!spec.paths) {
    return spec;
  }

  for (const pathItem of Object.values(spec.paths)) {
    if (!pathItem || typeof pathItem !== 'object') {
      continue;
    }

    for (const operation of Object.values(pathItem)) {
      if (!operation || typeof operation !== 'object' || !('tags' in operation)) {
        continue;
      }

      const taggedOperation = operation as { tags?: string[] };
      taggedOperation.tags = remapOperationTags(taggedOperation.tags);
    }
  }

  return spec;
});
