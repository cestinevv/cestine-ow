import { useTranslation } from 'react-i18next';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const INVITE_RULES = [
  {
    value: 'weekly-pool',
    titleKey: '每周邀请奖池是什么？',
    contentKey:
      '每周邀请奖池是平台为邀请活动设立的独立奖励池，用于奖励当周邀请行为，不会从被邀请人收益中扣除。奖池设有周发放上限，触顶后按份额等比缩减，每周一重新统计发放。',
  },
  {
    value: 'reward-calculation',
    titleKey: '邀请奖励怎么计算？',
    contentKey: '你获得的返佣 = 好友的实际产出 STORY × 返佣比例',
    secondaryContentKey:
      '例如：你的好友本周实得 1000 STORY，你获得 1000 × 10% = 100 STORY。',
  },
  {
    value: 'reward-ratio',
    titleKey: '返佣比例是多少？',
    levels: [
      'Lv 1 你直接邀请的好友 10%',
      'Lv 2 好友的好友 5%',
      'Lv 3 三层间接 3%',
      'Lv 4 四层间接 2%',
      'Lv 5 五层间接 1%',
    ],
  },
  {
    value: 'settlement-time',
    titleKey: '邀请奖励什么时候结算？',
    contentKey:
      '邀请奖励与经纪人页面的片酬在同一周期统一结算：每周一 00:00 (UTC) 截止统计，结算后可前往收益页领取。',
  },
] as const;

export function IncomeInviteRulesSection() {
  const { t } = useTranslation();

  return (
    <section
      className="w-full rounded-2xl bg-card p-4 md:p-5"
      aria-labelledby="income-invite-rules-heading"
    >
      <h2
        id="income-invite-rules-heading"
        className="pb-4 text-base leading-6 font-bold text-foreground"
      >
        {t('邀请规则')}
      </h2>
      <Accordion multiple defaultValue={INVITE_RULES.map((rule) => rule.value)}>
        {INVITE_RULES.map((rule) => (
          <AccordionItem
            key={rule.value}
            value={rule.value}
            className="border-t border-border not-last:border-b-0"
          >
            <AccordionTrigger className="items-center rounded-none border-0 py-4 text-base leading-6 text-foreground hover:no-underline focus-visible:ring-0 **:data-[slot=accordion-trigger-icon]:size-6 **:data-[slot=accordion-trigger-icon]:text-wallet-text-secondary">
              {t(rule.titleKey)}
            </AccordionTrigger>
            <AccordionContent className="pb-4 text-sm leading-5 text-wallet-text-secondary">
              {'contentKey' in rule ? <p>{t(rule.contentKey)}</p> : null}
              {'secondaryContentKey' in rule ? (
                <p className="mt-2">{t(rule.secondaryContentKey)}</p>
              ) : null}
              {'levels' in rule ? (
                <ul className="flex flex-col gap-1">
                  {rule.levels.map((level) => (
                    <li key={level}>{t(level)}</li>
                  ))}
                </ul>
              ) : null}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
