import { useTranslation } from 'react-i18next';

import { cn } from '@/utils';

type Props = {
  id: string;
};

const ITEMS = [
  {
    labelKey: '挖矿池（行为 + AI 互动）：',
    bodyKey:
      '按"周"为周期分发，每周池子大小逐年递减（建议第 1 年总量 20%，第 2 年 16%，第 3 年 13%，依次指数递减，留长尾）。',
  },
  {
    labelKey: '团队：',
    bodyKey: '1 年 cliff，之后 36 个月线性释放。',
  },
  {
    labelKey: '投资人：',
    bodyKey: '6 月 cliff，之后 24 个月线性释放。',
  },
  {
    labelKey: '国库 ：',
    bodyKey: '按平台运营节奏分批释放，每季度披露释放计划。',
  },
  {
    labelKey: '流动性 / Launchpad：',
    bodyKey: 'TGE（代币发行）即可使用。',
  },
] as const;

const BODY_CN = cn(
  'text-base leading-[26px] tracking-[-0.1px] text-foreground',
  'md:text-xl md:leading-9 md:tracking-[-0.08px]',
);

export function WhitepaperChapter12TokenRelease({ id }: Props) {
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
        {t('十二、代币释放机制')}
      </h2>

      <ul className={cn('list-disc space-y-0 ps-6 md:ps-[30px]', BODY_CN)}>
        {ITEMS.map((item) => (
          <li key={item.labelKey}>
            <span className="font-bold">{t(item.labelKey)}</span>
            {t(item.bodyKey)}
          </li>
        ))}
      </ul>
    </article>
  );
}
