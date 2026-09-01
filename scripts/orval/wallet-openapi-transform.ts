import { defineTransformer } from 'orval';

import { prepareFrontendOpenApiSpec } from './filter-internal-paths.js';

/**
 * Wallet OpenAPI tag → 前端稳定生成目录（userwallet-*）映射。
 * 后端 Apifox 使用可读 tag 名；Orval tags-split 按 tag 落盘，此处统一映射为历史目录名。
 * 新增 tag 时请同步补充 WALLET_TAG_ALIASES。
 */
const WALLET_TAG_ALIASES: Record<string, string> = {
  // Apifox 可读英文 tag（当前 spec 事实来源）
  'User Profile & Invitation': 'userwallet-user',
  Authentication: 'userwallet-auth',
  'Health Check': 'userwallet-health',
  'Assets & Ledger': 'userwallet-asset',
  'Actor NFT': 'userwallet-actornft',
  'Drama NFT': 'userwallet-dramanft',
  'Income Query': 'userwallet-income',
  Withdraw: 'userwallet-withdraw',

  // Orval 落盘 kebab-case（兼容 transformer 之后或其它工具链）
  'user-profile-invitation': 'userwallet-user',
  authentication: 'userwallet-auth',
  'health-check': 'userwallet-health',
  'assets-ledger': 'userwallet-asset',
  'actor-nft': 'userwallet-actornft',
  'drama-nft': 'userwallet-dramanft',
  'income-query': 'userwallet-income',
  withdraw: 'userwallet-withdraw',
};

function remapTagName(tag: string): string {
  return WALLET_TAG_ALIASES[tag] ?? tag;
}

function remapOperationTags(tags: string[] | undefined): string[] | undefined {
  if (!tags) {
    return tags;
  }

  return tags.map(remapTagName);
}

export default defineTransformer((spec) => {
  prepareFrontendOpenApiSpec(spec);

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
