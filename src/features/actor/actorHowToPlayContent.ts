export enum ActorHowToPlayTab {
  Sign = 'sign',
  Issue = 'issue',
}

export const ACTOR_HOW_TO_PLAY_TABS = [
  {
    key: ActorHowToPlayTab.Sign,
    titleKey: '签约IP',
    subtitleKey: '坐享片酬',
  },
  {
    key: ActorHowToPlayTab.Issue,
    titleKey: '发行IP',
    subtitleKey: '创作变现',
  },
] as const;

export const ACTOR_HOW_TO_PLAY_PANELS = {
  [ActorHowToPlayTab.Sign]: {
    positioningKey: '定位：零创作门槛，轻松稳赚收益',
    audiencePrefixKey: '不想创作，想低门槛赚 STORY 收益的',
    audienceEmphasisKey: '普通用户',
    guideBodyKey: '签约高热度高片酬角色 IP，在经纪人页面安排演出即可获利',
    rightsTitleKey: '收益权益',
    rights: [
      { bodyKey: '安排演出，持续赚取 STORY 代币' },
      { bodyKey: '角色 IP 可交易，赚取溢价收益' },
    ],
    showCreateCta: false,
  },
  [ActorHowToPlayTab.Issue]: {
    positioningKey: '定位：创作发行，多重收益，IP 长期增值',
    audiencePrefixKey: '有创作能力，想靠角色 IP、短剧变现的',
    audienceEmphasisKey: '创作者',
    guideBodyKey: '发行角色 IP，绑定 AI 短剧，提升作品热度，拉高 IP 片酬与收益',
    rightsTitleKey: '三重收益权益',
    rights: [
      {
        labelKey: '签约分成：',
        bodyKey: '自有 IP 被签约，享 40% 分成',
      },
      {
        labelKey: '演出收益：',
        bodyKey: '签约自家 IP，演出赚 STORY',
      },
      {
        labelKey: '价值增值：',
        bodyKey: 'IP 可交易，热度越高溢价越高',
      },
    ],
    showCreateCta: true,
  },
} as const;
