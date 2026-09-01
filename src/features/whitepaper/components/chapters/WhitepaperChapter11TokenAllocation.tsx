import { useTranslation } from 'react-i18next';

import { cn } from '@/utils';
import { WhitepaperBorderedTable } from '../WhitepaperBorderedTable';

type Props = {
  id: string;
};

const MAIN_TABLE_HEADER = ['分配类别', '比例', '数量（亿）', '说明'] as const;

const MAIN_TABLE_ROWS = [
  [
    '四角色行为挖矿池',
    '40%',
    '40',
    '创作者（含二创）/ 支持者 / 见证者 / 邀请者',
  ],
  ['AI 演员互动激励池', '15%', '15', '用户与 AI 演员互动专项'],
  ['生态 / 市场 / 运营', '5%', '5', '推广、空投、合作、初期种子用户'],
  ['团队', '15%', '15', '1 年 cliff，之后 36 月线性释放'],
  ['投资人', '10%', '10', '6 月 cliff，之后 24 月线性释放'],
  ['launchpad / 流动性', '10%', '10', 'Launchpad 上线、做市'],
  ['国库 / DAO 治理', '5%', '5', '长期治理储备'],
] as const;

const SUB_TABLE_HEADER = ['角色', '四角色池占比'] as const;
const SUB_TABLE_ROWS = [
  ['创作者（含原创+二创）', '35%'],
  ['支持者（观众）', '40%'],
  ['见证者（质押者）', '10%'],
  ['邀请者', '15%'],
] as const;

const HEADING_H2 = cn(
  'text-lg font-bold leading-[26px] tracking-[-0.04px] text-foreground',
  'md:text-[30px] md:leading-9 md:tracking-[-0.12px]',
);

const SUMMARY_CN = cn(
  'text-base font-bold leading-[26px] tracking-[-0.04px] text-foreground',
  'md:text-xl md:leading-9 md:tracking-[-0.08px]',
);

export function WhitepaperChapter11TokenAllocation({ id }: Props) {
  const { t } = useTranslation();

  return (
    <article
      id={id}
      className="space-y-8"
      data-aos="fade-up"
      data-aos-duration="600"
      data-aos-delay="100"
    >
      <h2 className={HEADING_H2}>{t('十一、STORY 代币总量与分配')}</h2>

      <p className={SUMMARY_CN}>
        {t('总量：100 亿（10,000,000,000）STORY，固定上限。')}
      </p>

      <WhitepaperBorderedTable
        headerKeys={MAIN_TABLE_HEADER}
        rowKeys={MAIN_TABLE_ROWS}
      />

      <h3 className={HEADING_H2}>{t('11.1 四角色挖矿池内部分配')}</h3>

      <WhitepaperBorderedTable
        headerKeys={SUB_TABLE_HEADER}
        rowKeys={SUB_TABLE_ROWS}
      />
    </article>
  );
}
