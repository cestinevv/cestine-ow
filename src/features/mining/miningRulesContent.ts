/** Figma 2E3Hw4eqvHRr7c8gaqY82H:1596-110843 — 规则弹窗 FAQ（经营玩法） */

export enum MiningRulesFaqId {
  StartEarning = 'startEarning',
  Stamina = 'stamina',
  FeeCalc = 'feeCalc',
  Settlement = 'settlement',
  Upgrade = 'upgrade',
}

export const MINING_RULES_DIALOG_TITLE_KEY = '经营玩法';

/** 摘要区逐行文案（禁止用 \\n 拼 key，便于 i18n:extract） */
export const MINING_RULES_SUMMARY_KEYS = [
  '签约角色、安排演出，每小时获得 STORY。',
  '升级角色，成倍提升每小时片酬。',
  '体力耗尽时及时补充，产出不间断。',
  '每周一 00:00 (UTC) 开始结算本期收益，前往收益页领取。',
] as const;

export const MINING_RULES_FAQ_START = {
  id: MiningRulesFaqId.StartEarning,
  titleKey: '怎么让角色开始赚钱？',
  bodyKeys: [
    '安排候场角色演出，每小时消耗1点体力并根据片酬产出 STORY。',
    '产出的STORY在每期结束时统一结算，结算后可前往收益页面领取。',
  ],
} as const;

export const MINING_RULES_FAQ_STAMINA = {
  id: MiningRulesFaqId.Stamina,
  titleKey: '体力怎么管理？',
  rows: [
    '演出中：每小时消耗 1 点体力，正常产出片酬',
    '体力耗尽：产出暂停为 0，需要及时处理',
    '休息：每小时自动恢复 1 点体力，但暂停片酬',
    '补充体力（付费）：瞬间回满 168，立即恢复产出',
  ] as const,
} as const;

export const MINING_RULES_FAQ_FEE = {
  id: MiningRulesFaqId.FeeCalc,
  titleKey: '片酬怎么算？',
  introKey: '咖位越高、角色越贵、短剧越火，每小时片酬就越高。',
  formulaRows: [
    '角色片酬 = Lv.1 角色片酬 × 片酬系数',
    'Lv.1 角色片酬 = 价格系数 × 热度系数',
  ] as const,
  factorTableTitleKey: '系数说明',
  factorRows: [
    '片酬系数：Lv1=1 · Lv2=3 · Lv3=9 · Lv4=27 · Lv5=81',
    '价格系数（发行价 P0）：',
  ] as const,
  priceFactorBullets: [
    'P0 ≤ 100U → 系数 = P0 ÷ 100（线性增长）',
    'P0 > 100U → 系数 = 1.6 × (P0/100)1.3 / [(P0/100)1.3 + 0.6]（渐近上限 1.6）',
  ] as const,
  heatRowKey: '热度系数：角色IP参演短剧的完播、点赞、收藏、评分越多，热度越高',
} as const;

export const MINING_RULES_FAQ_SETTLEMENT = {
  id: MiningRulesFaqId.Settlement,
  titleKey: '什么时候结算？钱怎么到账？',
  introKey:
    '每 7 天为一个结算周期。每周一 00:00 (UTC) 截止统计，系统在 24 小时内结算完毕，前往收益页领取。全平台有一个总奖池（周硬顶），初始约 211 万 STORY，逐周递减（× 0.99572）。',
  distributionRows: [
    '全网名义产出 ≤ 当周硬顶 → 实发 = 名义产出，剩余额度作废',
    '全网名义产出 > 当周硬顶 → 等比缩放：你实得 = 你的名义产出 × (奖池 ÷ 全网产出)',
    '单地址超过奖池 5% → 超出部分不发，不回流，不补分',
  ] as const,
} as const;

export const MINING_RULES_FAQ_UPGRADE = {
  id: MiningRulesFaqId.Upgrade,
  titleKey: '怎么升级角色？',
  introKey: '升级条件：消耗 2 张同IP同等级分身 + IP参演短剧累计完播数达标',
  pathRows: [
    'Lv1→Lv2：≥1万完播 · 片酬 1→3',
    'Lv2→Lv3：≥5万完播 · 片酬 3→9',
    'Lv3→Lv4：≥20万完播 · 片酬 9→27',
    'Lv4→Lv5：≥100万完播 · 片酬 27→81',
  ] as const,
} as const;

export const MINING_RULES_FAQ_ALL = [
  MiningRulesFaqId.StartEarning,
  MiningRulesFaqId.Stamina,
  MiningRulesFaqId.FeeCalc,
  MiningRulesFaqId.Settlement,
  MiningRulesFaqId.Upgrade,
] as const;

export const MINING_RULES_FAQ_TITLE_KEY: Record<MiningRulesFaqId, string> = {
  [MiningRulesFaqId.StartEarning]: MINING_RULES_FAQ_START.titleKey,
  [MiningRulesFaqId.Stamina]: MINING_RULES_FAQ_STAMINA.titleKey,
  [MiningRulesFaqId.FeeCalc]: MINING_RULES_FAQ_FEE.titleKey,
  [MiningRulesFaqId.Settlement]: MINING_RULES_FAQ_SETTLEMENT.titleKey,
  [MiningRulesFaqId.Upgrade]: MINING_RULES_FAQ_UPGRADE.titleKey,
};
