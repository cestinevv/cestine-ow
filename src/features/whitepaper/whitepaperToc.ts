/** 正文顶部 header 展示（不计入 TOC 导航） */
export const WHITEPAPER_HEADER_KEYS = [
  '愿景：认识你自己',
  '使命：创造属于自己的故事',
] as const;

export const WHITEPAPER_HEADER_SECTION_IDS = [
  'whitepaper-vision',
  'whitepaper-mission',
] as const;

/** 目录项：从「一、缘起」起共 16 章 */
export const WHITEPAPER_TOC_KEYS = [
  '一、缘起',
  '二、问题',
  '三、转折点',
  '四、StoryFun 的诞生',
  '五、解决路径',
  '六、愿景与使命',
  '七、项目定位',
  '八、角色生态总览',
  '九、现金收入结构',
  '十、见证者反哺池机制',
  '十一、STORY 代币总量与分配',
  '十二、代币释放机制',
  '十三、四角色 Token 激励模型',
  '十四、AI 演员互动激励模型',
  '十五、销毁与通缩机制',
  '十六、结语',
] as const;

export const WHITEPAPER_SECTION_IDS = [
  'whitepaper-origin',
  'whitepaper-problem',
  'whitepaper-turning',
  'whitepaper-birth',
  'whitepaper-path',
  'whitepaper-vision-and-mission',
  'whitepaper-positioning',
  'whitepaper-role-ecosystem',
  'whitepaper-cash-income',
  'whitepaper-witness-rebate',
  'whitepaper-token-allocation',
  'whitepaper-token-release',
  'whitepaper-token-incentive',
  'whitepaper-ai-interaction',
  'whitepaper-burn',
  'whitepaper-closing',
] as const;

/** hash 深链：header 锚点 + 章节目录锚点 */
export const WHITEPAPER_ALL_ANCHOR_IDS = [
  ...WHITEPAPER_HEADER_SECTION_IDS,
  ...WHITEPAPER_SECTION_IDS,
] as const;

/** 章节锚点相对 sticky 页头的留白（px），滚动 Spy 与点击滚动须共用。 */
export const WHITEPAPER_TOC_HEADER_GAP_PX = 120;
