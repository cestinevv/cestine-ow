import { useTranslation } from 'react-i18next';

import { cn } from '@/utils';
import { WhitepaperBorderedTable } from '../WhitepaperBorderedTable';

type Props = {
  id: string;
};

const TABLE_HEADER = ['销毁来源', '说明'] as const;
const TABLE_ROWS = [
  ['USDC 收入回购销毁', '平台收入中按 50% 在二级市场回购 STORY 销毁'],
  ['NFT 二级手续费销毁', '5% 手续费中按一定比例回购 STORY 销毁'],
  ['协议交易费销毁', 'STORY 链上交易、兑换等手续费的一部分销毁'],
  ['STORY 直接付费场景', '用户用 STORY 付费时，按比例直接销毁一部分'],
] as const;

const HEADING_H2 = cn(
  'text-lg font-bold leading-[26px] tracking-[-0.04px] text-foreground',
  'md:text-[30px] md:leading-9 md:tracking-[-0.12px]',
);

const BODY_CN = cn(
  'text-base leading-[26px] tracking-[-0.1px] text-foreground',
  'md:text-xl md:leading-9 md:tracking-[-0.08px]',
);

export function WhitepaperChapter15Burn({ id }: Props) {
  const { t } = useTranslation();

  return (
    <article
      id={id}
      className="space-y-8"
      data-aos="fade-up"
      data-aos-duration="600"
      data-aos-delay="100"
    >
      <h2 className={HEADING_H2}>{t('十五、销毁与通缩机制')}</h2>

      <WhitepaperBorderedTable headerKeys={TABLE_HEADER} rowKeys={TABLE_ROWS} />

      <p className={BODY_CN}>
        {t('所有销毁均链上可查，平台每月披露销毁报告。')}
      </p>
    </article>
  );
}
