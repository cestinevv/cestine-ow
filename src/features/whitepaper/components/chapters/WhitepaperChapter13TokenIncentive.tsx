import { useTranslation } from 'react-i18next';

import { cn } from '@/utils';
import { WhitepaperBorderedTable } from '../WhitepaperBorderedTable';
import { WhitepaperCodeBlock } from '../WhitepaperCodeBlock';

type Props = {
  id: string;
};

const TABLE_131_HEADER = ['行为', '颗粒度', '计入对象'] as const;
const TABLE_131_ROWS = [
  ['完播', '每集', '该剧 + 该用户'],
  ['点赞', '每集', '该剧 + 该用户'],
  ['收藏', '每剧', '该剧 + 该用户'],
  ['评分', '每剧', '该剧 + 该用户'],
  ['付费', '每集', '该剧 + 该用户'],
  ['质押', '每剧', '该剧 + 该用户'],
] as const;

const TABLE_132_HEADER = ['行为', '权重'] as const;
const TABLE_132_ROWS = [
  ['完播', 'W1 = 1'],
  ['点赞', 'W2 = 1'],
  ['收藏', 'W3 = 3'],
  ['评分', 'W4 = 5'],
  ['付费', 'W5 = 10'],
  ['质押', 'W6 = 0.001（每 STORY）'],
] as const;

const TABLE_133_HEADER = ['行为', '权重', '设计意图'] as const;
const TABLE_133_ROWS = [
  ['完播 C1', '2', '留存信号比单纯播放重要'],
  ['点赞 C2', '1', '易刷，权重不能太高'],
  ['收藏 C3', '5', '主动收藏是强质量信号'],
  ['评分 C4', '3', '比收藏弱'],
  ['付费 C5', '20', '最强质量信号，付费=认可'],
  ['获得质押 STORY C6', '0.002/STORY', '见证者用钱投票，比观众付费更长期'],
  ['累计支持者人数 C7', '0.5/人', '覆盖广度（防止小圈子刷分）'],
] as const;

const TABLE_134_HEADER = ['质押天数', '系数'] as const;
const TABLE_134_ROWS = [
  ['< 7 天', '0.5'],
  ['7–30 天', '1'],
  ['30–90 天', '1.5'],
  ['> 90 天', '2'],
] as const;

const TABLE_1352_COEF_HEADER = ['被邀人注册时长', '邀请系数'] as const;
const TABLE_1352_COEF_ROWS = [
  ['0–30 天', '1'],
  ['31–90 天', '0.7'],
  ['> 90 天', '0.4'],
] as const;

const TABLE_1352_WEIGHT_HEADER = ['行为', '权重'] as const;
const TABLE_1352_WEIGHT_ROWS = [
  ['完播', '0.5'],
  ['点赞', '0.5'],
  ['收藏', '1.5'],
  ['评分', '2.5'],
  ['付费', '30（占主导）'],
  ['质押 STORY', '0.001 / STORY'],
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

export function WhitepaperChapter13TokenIncentive({ id }: Props) {
  const { t } = useTranslation();

  return (
    <article
      id={id}
      className="space-y-12"
      data-aos="fade-up"
      data-aos-duration="600"
      data-aos-delay="100"
    >
      <h2 className={HEADING_H2}>{t('十三、四角色 Token 激励模型')}</h2>

      {/* 13.1 通用行为统计单元 */}
      <section className="space-y-6">
        <h3 className={SUBHEADING_CN}>{t('13.1 通用行为统计单元')}</h3>
        <p className={BODY_CN}>
          {t('所有角色的行为分数都基于以下统一行为字段（颗粒度严格区分）：')}
        </p>
        <WhitepaperBorderedTable
          headerKeys={TABLE_131_HEADER}
          rowKeys={TABLE_131_ROWS}
        />
        <p className={BODY_CN}>
          <span className="font-bold">{t('双向累加规则（重要）：')}</span>
          {t(
            '每个剧的得分 = 所有用户在「该剧」上的行为加权求和 → 用于剧集排名、创作者奖励、判断"剧好不好"。 每个用户的得分 = 该用户在「所有剧」上的行为加权累加 → 用于用户激励，鼓励重度用户跨剧使用，对平台有利。',
          )}
        </p>
      </section>

      {/* 13.2 支持者激励公式 */}
      <section className="space-y-6">
        <h3 className={SUBHEADING_CN}>{t('13.2 支持者（观众）激励公式')}</h3>
        <p className={BODY_CN}>{t('用户每周支持者 Token 奖励：')}</p>
        <WhitepaperCodeBlock>
          <p className={FORMULA_CN}>
            {t(
              '支持者奖励 = (用户支持者得分 / 全平台支持者总得分) × 当期支持者池 × trust\n用户支持者得分 = Σ(用户在每部剧上的支持者得分)\n每剧上的支持者得分 = 完播次数×W1 + 点赞数×W2 + 收藏×W3 + 评分×W4 + 付费集数×W5 + 质押 STORY 数×W6',
            )}
          </p>
        </WhitepaperCodeBlock>
        <p className={SUBHEADING_CN}>{t('默认权重建议：')}</p>
        <WhitepaperBorderedTable
          headerKeys={TABLE_132_HEADER}
          rowKeys={TABLE_132_ROWS}
        />
      </section>

      {/* 13.3 创作者激励公式 */}
      <section className="space-y-6">
        <h3 className={SUBHEADING_CN}>{t('13.3 创作者激励公式（含二创）')}</h3>
        <WhitepaperCodeBlock>
          <p className={FORMULA_CN}>
            {t(
              '创作者奖励 = (用户创作者得分 / 全平台创作者总得分) × 当期创作者池 × trust\n用户创作者得分 = Σ(该创作者名下每部剧的剧得分)',
            )}
          </p>
        </WhitepaperCodeBlock>
        <p className={BODY_CN}>
          <span className="font-bold">{t('关键：')}</span>
          {t(
            '原创剧与二创剧统一进入创作者得分，无差别参与创作者池分配。 二创内容的"IP 使用费"已经在现金层面（5.5）回流给原创作者，Token 激励层面不再重复区分。',
          )}
        </p>
        <WhitepaperCodeBlock>
          <p className={FORMULA_CN}>
            {t(
              '剧得分 = 累计完播×C1 + 累计点赞×C2 + 累计收藏×C3 + 累计评分×C4 + 累计付费×C5 + 累计获得质押 STORY×C6 + 累计支持者人数×C7',
            )}
          </p>
        </WhitepaperCodeBlock>
        <p className={BODY_CN}>
          {t(
            '"剧好不好"的判断标准就是这个剧得分公式。 这也是本剧能否在平台获得自然流量加成、推荐位与额外曝光的依据。',
          )}
        </p>
        <p className={SUBHEADING_CN}>{t('剧得分权重 —— 衡量剧的真实质量')}</p>
        <WhitepaperBorderedTable
          headerKeys={TABLE_133_HEADER}
          rowKeys={TABLE_133_ROWS}
        />
        <div className={cn('space-y-0', BODY_CN)}>
          <p className="font-bold">{t('几个关键差异说明')}</p>
          <p>
            {t(
              '付费权重 C5 > W5（20 vs 10）：对剧来说，被付费是最硬核的质量证明；对用户来说付费只是众多互动方式之一。',
            )}
          </p>
          <p>
            {t(
              '点赞权重 C2 ≤ W2：点赞对用户来说是低门槛参与值得鼓励，但对剧的质量评估来说点赞太容易刷，必须降权。',
            )}
          </p>
          <p>
            {t(
              'C 系列多一个 C7（支持者人数）：防止"100 个铁粉刷出 1 万付费 vs 1 万人零散付费"的差异被掩盖——后者是真火，前者可能是刷量。',
            )}
          </p>
          <p>
            {t(
              'C6 略高于 W6：见证者质押表达的是更长期、更高风险的看好，对剧的质量背书价值更高。',
            )}
          </p>
        </div>
      </section>

      {/* 13.4 见证者激励公式 */}
      <section className="space-y-6">
        <h3 className={SUBHEADING_CN}>{t('13.4 见证者（质押者）激励公式')}</h3>
        <WhitepaperCodeBlock>
          <p className={FORMULA_CN}>
            {t(
              '见证者 Token 奖励 = (用户质押权重 / 全平台总质押权重) × 当期见证者池 × trust\n用户质押权重 = Σ(单剧质押 STORY × 质押时长系数)',
            )}
          </p>
        </WhitepaperCodeBlock>
        <p className={SUBHEADING_CN}>{t('质押时长系数：')}</p>
        <WhitepaperBorderedTable
          headerKeys={TABLE_134_HEADER}
          rowKeys={TABLE_134_ROWS}
        />
        <p className={BODY_CN}>
          {t(
            '此处只是 Token 激励。现金分润由"反哺池"按当期质押 STORY 数量比例分发，不计时长。两者计算逻辑完全独立。',
          )}
        </p>
      </section>

      {/* 13.5 邀请者激励公式 */}
      <section className="space-y-6">
        <h3 className={SUBHEADING_CN}>{t('13.5 邀请者激励公式（双轨）')}</h3>

        <div className="space-y-6">
          <h4 className={SUBHEADING_CN}>{t('13.5.1 现金奖励（USDC）')}</h4>
          <WhitepaperCodeBlock>
            <p className={FORMULA_CN}>
              {t('邀请者 USDC 奖励 = 被邀人 USDC 消费 × 5%')}
            </p>
          </WhitepaperCodeBlock>
          <p className={BODY_CN}>
            {t(
              '适用所有 USDC 消费场景：剧集付费 + AI 演员消费 + NFT 一级购买。 5% 由平台从总消费额独立扣出，不嵌套从创作者份额扣。',
            )}
          </p>
        </div>

        <div className="space-y-6">
          <h4 className={SUBHEADING_CN}>{t('13.5.2 Token 激励')}</h4>
          <WhitepaperCodeBlock>
            <p className={FORMULA_CN}>
              {t(
                '邀请者 Token 奖励 = (邀请者总得分 / 全平台邀请者总得分) × 当期邀请者池 × trust\n邀请者总得分 = Σ(被邀人本期行为得分 × 邀请系数)',
              )}
            </p>
          </WhitepaperCodeBlock>
          <p className={SUBHEADING_CN}>
            {t('邀请系数（按被邀人注册时长衰减）：')}
          </p>
          <WhitepaperBorderedTable
            headerKeys={TABLE_1352_COEF_HEADER}
            rowKeys={TABLE_1352_COEF_ROWS}
          />
          <p className={SUBHEADING_CN}>
            {t(
              '被邀人行为得分内部权重（与支持者公式有所不同，付费占比加大）：',
            )}
          </p>
          <WhitepaperBorderedTable
            headerKeys={TABLE_1352_WEIGHT_HEADER}
            rowKeys={TABLE_1352_WEIGHT_ROWS}
          />
          <p className={BODY_CN}>
            <span className="font-bold">{t('设计原则：')}</span>
            {t(
              '付费占大头但不一刀切。被邀人即便不付费，只要在平台活跃，邀请者也能拿到 Token 激励。',
            )}
          </p>
        </div>
      </section>
    </article>
  );
}
