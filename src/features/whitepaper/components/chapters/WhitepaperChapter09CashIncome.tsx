import { useTranslation } from 'react-i18next';

import { cn } from '@/utils';
import { WhitepaperBorderedTable } from '../WhitepaperBorderedTable';

type Props = {
  id: string;
};

const TABLE_91_HEADER = ['收入类别', '说明'] as const;
const TABLE_91_ROWS = [
  ['剧集付费收入', '用户解锁单集付费（原创剧 / 二创剧）'],
  ['AI 演员互动收入', '用户与 AI 演员聊天、打赏、付费消费'],
  ['NFT 发行手续费收入', '演员 NFT 首发手续费'],
  ['NFT 二级市场版税', '演员 NFT 交易版税抽成'],
  ['二创授权收入', '二创内容产生的付费分润'],
  ['协议交易费', '平台内 STORY 兑换、链上操作等手续费'],
] as const;

const TABLE_92_HEADER = ['分配对象', '比例'] as const;
const TABLE_92_ROWS = [
  ['创作者&演员 NFT', '70%'],
  ['见证者反哺池（该剧质押者按质押比例分）', '10%'],
  ['邀请者（被邀人付费的 5%，独立列支）', '5%'],
  ['平台收入', '余额（一般 ≥ 15%）'],
] as const;

const TABLE_93_HEADER = ['分配对象', '比例'] as const;
const TABLE_93_ROWS = [
  ['演员 NFT 池（含创作者，按持仓比例分）', '55%'],
  ['邀请者（被邀人 AI 消费的 5%，独立列支）', '5%'],
  ['平台收入', '40%'],
] as const;

const TABLE_95_STEP1_HEADER = ['分配对象', '比例'] as const;
const TABLE_95_STEP1_ROWS = [
  ['创作者池（原创+二创共享，待二次分配）+演员 NFT 池', '70%'],
  ['见证者反哺池（该二创剧的质押者）', '10%'],
  ['邀请者', '5%'],
  ['平台收入', '余额'],
] as const;

const TABLE_95_STEP2_HEADER = [
  '分配对象',
  '占创作者池比例',
  '占总收入比例',
] as const;
const TABLE_95_STEP2_ROWS = [
  ['二创者（实际制作人）', '80%', '56%'],
  ['原创作者（IP 授权方）', '20%', '14%'],
] as const;

const DESIGN_LOGIC_ITEMS = [
  '二创者是真正的内容生产者，应拿大头。',
  '原创作者出 IP，对应拿到 IP 授权费，比例由平台设定上限（如 10%–30%），创作者上传二创时可在区间内协商。',
  '见证者反哺池属于二创剧自己——质押的是二创剧，分的是二创剧的收入，与原创剧无关。',
  '演员NFT 比例按照二创者新设定——AI 演员如果使用原 角色IP ，二创可以单独给对应比例的收入，从二创收入里分。',
] as const;

const SUBHEADING_CN = cn(
  'text-base font-bold leading-[26px] tracking-[-0.04px] text-foreground',
  'md:text-xl md:leading-9 md:tracking-[-0.08px]',
);

const BODY_CN = cn(
  'text-base leading-[26px] tracking-[-0.1px] text-foreground',
  'md:text-xl md:leading-9 md:tracking-[-0.08px]',
);

const LIST_DISC_CN = cn('list-disc space-y-0 ps-6 md:ps-[30px]', BODY_CN);
const LIST_DECIMAL_CN = cn('list-decimal space-y-0 ps-6 md:ps-[30px]', BODY_CN);

export function WhitepaperChapter09CashIncome({ id }: Props) {
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
        {t('九、现金收入结构')}
      </h2>

      <section className="space-y-3">
        <h3 className={SUBHEADING_CN}>{t('9.1 主要现金收入来源')}</h3>
        <WhitepaperBorderedTable
          headerKeys={TABLE_91_HEADER}
          rowKeys={TABLE_91_ROWS}
        />
      </section>

      <section className="space-y-3">
        <h3 className={SUBHEADING_CN}>{t('9.2 原创剧集付费收入分配')}</h3>
        <WhitepaperBorderedTable
          headerKeys={TABLE_92_HEADER}
          rowKeys={TABLE_92_ROWS}
        />
      </section>

      <section className="space-y-3">
        <h3 className={SUBHEADING_CN}>
          {t('9.3 AI 演员互动收入分配（建议比例）')}
        </h3>
        <WhitepaperBorderedTable
          headerKeys={TABLE_93_HEADER}
          rowKeys={TABLE_93_ROWS}
        />
      </section>

      <section className="space-y-3">
        <h3 className={SUBHEADING_CN}>{t('9.4 NFT 二级市场交易手续费分配')}</h3>
        <ul className={LIST_DISC_CN}>
          <li>{t('Mint手续费：固定 10 USDC')}</li>
          <li>
            {t('二级市场交易手续费（如总抽 5%）：创作者版税 2.5%，平台 2.5%。')}
          </li>
        </ul>
      </section>

      <section className="space-y-6">
        <h3 className={SUBHEADING_CN}>{t('9.5 二创剧集付费收入分配')}</h3>
        <p className={BODY_CN}>
          {t(
            '二创剧集在身份上仍属于"剧集"，走 5.2 的标准分配；但创作者那 70% 的份额内部需要在原创与二创之间再分一次，用以兑现 IP 授权关系。',
          )}
        </p>

        <div className="space-y-3">
          <h4 className={SUBHEADING_CN}>
            {t('第一步：剧集总收入按 5.2 标准分配')}
          </h4>
          <WhitepaperBorderedTable
            headerKeys={TABLE_95_STEP1_HEADER}
            rowKeys={TABLE_95_STEP1_ROWS}
          />
        </div>

        <div className="space-y-3">
          <h4 className={SUBHEADING_CN}>
            {t('第二步：创作者池 70% 在原创与二创之间二次分配（建议）')}
          </h4>
          <WhitepaperBorderedTable
            headerKeys={TABLE_95_STEP2_HEADER}
            rowKeys={TABLE_95_STEP2_ROWS}
          />
        </div>

        <div className="space-y-3">
          <p className={cn(SUBHEADING_CN)}>{t('设计逻辑：')}</p>
          <ol className={LIST_DECIMAL_CN}>
            {DESIGN_LOGIC_ITEMS.map((item) => (
              <li key={item}>{t(item)}</li>
            ))}
          </ol>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className={SUBHEADING_CN}>{t('9.6 邀请者收入汇总')}</h3>
        <p className={BODY_CN}>
          {t(
            '无论用户消费的是原创剧、二创剧、AI 演员互动，还是 NFT 购买，邀请者均统一拿到被邀人 消费的 5%',
          )}
        </p>
      </section>
    </article>
  );
}
