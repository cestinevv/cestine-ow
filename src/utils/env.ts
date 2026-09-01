/** 是否为 Vite `--mode production`（与 `build:production` / `pnpm production` 对齐） */
const mode =
  (typeof import.meta !== 'undefined' &&
    typeof import.meta.env?.MODE === 'string' &&
    import.meta.env.MODE) ||
  process.env.NODE_ENV ||
  'development';

export const IS_PRODUCTION = mode === 'production';
export const IS_DEVELOPMENT = mode === 'development';

/** 非 production 环境展示完整 UI（白皮书、角色 IP Tab/入口等）；production 隐藏 */
export const SHOW_DEV_ONLY_UI = !IS_PRODUCTION;

/** 非 production 环境开放导航入口（IP市场、经纪人、收益、邀请、发行IP 等） */
export const IS_DEV_ONLY_NAV_FEATURES_ENABLED = !IS_PRODUCTION;
