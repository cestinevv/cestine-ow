import { useTranslation } from 'react-i18next';

import { cn } from '@/utils';

type Props = {
  id: string;
};

const ITEMS = [
  {
    labelKey: '资金来源：',
    bodyKey: '每部剧（含原创与二创）付费收入的 10%（USDC）。',
  },
  {
    labelKey: '分配对象：',
    bodyKey: '仅限该剧的 STORY 质押者（见证者）。',
  },
  {
    labelKey: '分配规则：',
    bodyKey: '按当期质押 STORY 数量比例分配。',
  },
  {
    labelKey: '与剧好坏的关系：',
    bodyKey:
      '质押者通过"选择质押哪部剧"承担市场风险——剧赚钱，反哺池就大；剧不赚钱，反哺池就小。',
  },
] as const;

const BODY_CN = cn(
  'text-base leading-[26px] tracking-[-0.1px] text-foreground',
  'md:text-xl md:leading-9 md:tracking-[-0.08px]',
);

export function WhitepaperChapter10WitnessRebatePool({ id }: Props) {
  const { t } = useTranslation();

  return (
    <article
      id={id}
      className="space-y-8"
      data-aos="fade-up"
      data-aos-duration="600"
      data-aos-delay="100"
    >
      <h2 className="text-lg font-bold leading-[26px] tracking-[-0.04px] text-foreground md:text-[30px] md:leading-9 md:tracking-[-0.12px]">
        {t('十、见证者反哺池机制')}
      </h2>

      <ul className={cn('list-disc space-y-0 ps-6 md:ps-[30px]', BODY_CN)}>
        {ITEMS.map((item) => (
          <li key={item.labelKey}>
            <span className="font-bold">{t(item.labelKey)}</span>
            {t(item.bodyKey)}
          </li>
        ))}
      </ul>

      <p className={BODY_CN}>
        {t(
          '关键说明：质押 STORY 的数量只影响 Token 激励的得分（见 9.5），不影响反哺池现金分润。反哺池现金分润纯粹按当期 STORY 质押比例分。两者解耦。',
        )}
      </p>
    </article>
  );
}
