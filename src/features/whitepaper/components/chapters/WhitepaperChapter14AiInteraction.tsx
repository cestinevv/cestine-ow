import { useTranslation } from 'react-i18next';

import { cn } from '@/utils';
import { WhitepaperBorderedTable } from '../WhitepaperBorderedTable';
import { WhitepaperCodeBlock } from '../WhitepaperCodeBlock';

type Props = {
  id: string;
};

const TABLE_141_HEADER = ['行为', '权重'] as const;
const TABLE_141_ROWS = [
  ['聊天', 'A1 = 0.1 / 条'],
  ['打赏 STORY', 'A2 = 0.5 / STORY'],
  ['付费 USDC', 'A3 = 5 / USDC'],
  ['互动天数', 'A4 = 2 / 天'],
] as const;

const HEADING_H2 = cn(
  'text-lg font-bold leading-[26px] tracking-[-0.04px] text-foreground',
  'md:text-[30px] md:leading-9 md:tracking-[-0.12px]',
);

const SUBHEADING_CN = cn(
  'text-base font-bold leading-[26px] tracking-[-0.04px] text-foreground',
  'md:text-xl md:leading-9 md:tracking-[-0.08px]',
);

const BODY_CN = cn(
  'text-base leading-[26px] tracking-[-0.1px] text-foreground',
  'md:text-xl md:leading-9 md:tracking-[-0.08px]',
);

const FORMULA_CN = cn(
  'whitespace-pre-wrap font-mono break-words',
  'text-sm leading-6 tracking-[-0.08px] text-foreground',
  'md:text-base md:leading-7',
);

export function WhitepaperChapter14AiInteraction({ id }: Props) {
  const { t } = useTranslation();

  return (
    <article
      id={id}
      className="space-y-12"
      data-aos="fade-up"
      data-aos-duration="600"
      data-aos-delay="100"
    >
      <h2 className={HEADING_H2}>{t('十四、AI 演员互动激励模型')}</h2>

      <p className={BODY_CN}>
        {t(
          '单列原因：AI 演员互动是用户与单个 AI 演员之间的关系，方向与剧集互动不同，需要独立的精准激励层。',
        )}
      </p>

      {/* 14.1 用户与 AI 演员互动的 Token 奖励 */}
      <section className="space-y-6">
        <h3 className={SUBHEADING_CN}>
          {t('14.1 用户与 AI 演员互动的 Token 奖励')}
        </h3>
        <WhitepaperCodeBlock>
          <p className={FORMULA_CN}>
            {t(
              '用户 AI 互动得分 = Σ(每个 AI 演员的互动行为得分)\n每个 AI 演员互动行为得分 = 聊天条数×A1 + 打赏 STORY 数×A2 + 付费 USDC 数×A3 + 累计互动天数×A4\n用户 AI 互动 Token 奖励 = (用户 AI 互动得分 / 全平台总 AI 互动得分) × 当期 AI 互动池 × trust',
            )}
          </p>
        </WhitepaperCodeBlock>
        <p className={SUBHEADING_CN}>{t('默认权重建议：')}</p>
        <WhitepaperBorderedTable
          headerKeys={TABLE_141_HEADER}
          rowKeys={TABLE_141_ROWS}
        />
      </section>

      {/* 14.2 AI 演员 NFT 持有者收入 */}
      <section className="space-y-6">
        <h3 className={SUBHEADING_CN}>{t('14.2 AI 演员 NFT 持有者收入')}</h3>
        <p className={BODY_CN}>
          {t(
            '不通过 Token 激励池，直接通过现金分润结算（已在 4.4 与 5.3 说明）。',
          )}
        </p>
        <p className={BODY_CN}>
          {t('收入 = 来自剧集分润 + 来自该演员所有打赏与付费消费分润')}
        </p>
        <p className={BODY_CN}>
          {t('分配方式 = 按 NFT 持有数量比例分给所有持有者（含创作者）')}
        </p>
      </section>

      {/* 14.3 邀请者在 AI 互动场景中的收入 */}
      <section className="space-y-6">
        <h3 className={SUBHEADING_CN}>
          {t('14.3 邀请者在 AI 互动场景中的收入')}
        </h3>
        <p className={BODY_CN}>
          {t('现金：被邀人 AI 消费 USDC × 5%（与剧集付费同口径）')}
        </p>
        <p className={BODY_CN}>
          {t('Token：被邀人 AI 互动得分按邀请系数计入邀请者 Token 池')}
        </p>
      </section>
    </article>
  );
}
