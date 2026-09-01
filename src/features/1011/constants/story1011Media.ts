import type { CSSProperties } from 'react';

import boardedHero from '@/assets/image/story-checkin/boarded-hero.png';
import boardedHeroDark from '@/assets/image/story-checkin/boarded-hero-dark.png';
import character from '@/assets/image/story-checkin/character.png';
import heroBg from '@/assets/image/story-checkin/hero-bg.png';
import heroBgDark from '@/assets/image/story-checkin/hero-bg-dark.jpg';
import pointsCoin from '@/assets/image/story-checkin/points-coin.png';
import pointsRewardCoin from '@/assets/image/story-checkin/points-reward-coin.png';
import rankBronze from '@/assets/image/story-checkin/rank-bronze.png';
import rankGold from '@/assets/image/story-checkin/rank-gold.png';
import rankSilver from '@/assets/image/story-checkin/rank-silver.png';
import socialTiktok from '@/assets/image/story-checkin/social-tiktok.png';
import socialYoutube from '@/assets/image/story-checkin/social-youtube.png';
import taskPlay from '@/assets/image/story-checkin/task-play.png';

/** Figma 导出位图：src/assets/image/story-checkin（1× 布局；源为 2×） */
export const story1011Media = {
  /** 浅色表单 / 登船后底图 */
  heroBg,
  /** 深色表单底图 — Figma 6952:36847 / 6962:37865，2× JPG */
  heroBgDark,
  boardedHero,
  /** 登船后 Hero 深色底图 — Figma 6962:46844，源 1536×1024 */
  boardedHeroDark,
  character,
  pointsCoin,
  /** Figma 7090:92230 积分奖励弹窗金币，展示 64×64 */
  pointsRewardCoin,
  rankGold,
  rankSilver,
  rankBronze,
  taskPlay,
  /** Figma 6962:47050 Social icon · TikTok，展示 24×24 */
  socialTiktok,
  /** Figma 6962:47055 Social icon · YouTube，展示 24×24 */
  socialYoutube,
} as const;

/**
 * 登船后主内容区背景：主题渐变叠层 + hero 位图满宽、等比高度、纵向平铺
 * 浅色 / 深色叠层与底色见 `--story-checkin-page-*`（Figma 6962:46798）
 * 深色位图：`--story-checkin-hero-url`（由 BoardedView 根节点按主题注入）
 */
export const story1011BoardedPageBackgroundStyle: CSSProperties = {
  backgroundImage:
    'var(--story-checkin-page-overlay), var(--story-checkin-hero-url)',
  backgroundColor: 'var(--story-checkin-page-bg)',
  backgroundPosition: 'center top, center top',
  backgroundSize: '100% 100%, 100% auto',
  backgroundRepeat: 'no-repeat, repeat-y',
};

/** 按主题解析登船后页 hero 底图 URL（浅色 / 深色分图） */
export function getStory1011HeroUrl(isDark: boolean): string {
  return isDark ? heroBgDark : heroBg;
}

/** 排行榜前三名奖牌（Figma 6962:46901 / 46902 / 46903，展示 22×22） */
export const story1011RankMedals = {
  1: rankGold,
  2: rankSilver,
  3: rankBronze,
} as const;
