import { useTranslation } from 'react-i18next';

import { cn } from '@/utils';
import { WhitepaperBorderedTable } from '../WhitepaperBorderedTable';

type Props = {
  id: string;
};

const ROLE_TABLE_HEADER = [
  '角色',
  '行为',
  '现金分润',
  'Token 激励（STORY）',
] as const;

const ROLE_TABLE_ROWS = [
  [
    '创作者（Creator）',
    '上传剧（原创/二创）、运营 IP、铸造演员 NFT',
    '剧集付费分润 + NFT IP 分润',
    '创作行为挖矿',
  ],
  [
    '支持者（Supporter / 观众）',
    '观看、付费、点赞、收藏、评分',
    ' ',
    '互动行为挖矿',
  ],
  [
    '见证者（Witness / 质押者）',
    '质押 STORY 到具体剧集',
    '反哺池现金分润',
    '质押挖矿',
  ],
  [
    '邀请者（Inviter）',
    '拉新',
    '被邀人 USDC 消费 5%',
    '被邀人行为挖矿（按邀请系数）',
  ],
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

export function WhitepaperChapter08RoleEcosystem({ id }: Props) {
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
        {t('八、角色生态总览')}
      </h2>

      <WhitepaperBorderedTable
        headerKeys={ROLE_TABLE_HEADER}
        rowKeys={ROLE_TABLE_ROWS}
      />

      <section className="space-y-3">
        <h3 className={SUBHEADING_CN}>{t('AI 演员 IP 体系')}</h3>
      </section>

      <section className="space-y-3">
        <h3 className={SUBHEADING_CN}>{t('8.1 NFT 类型与铸造')}</h3>
        <ul className={LIST_DISC_CN}>
          <li>
            {t(
              '剧 NFT（Solana · Metaplex Core）：创作者上传剧时铸造，唯一标识一部剧的 IP。',
            )}
          </li>
          <li>
            {t(
              '演员 NFT（Solana · pNFT / Token-2022）：创作者在剧 NFT 下铸造，每个演员独立发行，可被多用户共同持有。',
            )}
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h3 className={SUBHEADING_CN}>{t('8.2 演员 NFT 的核心规则')}</h3>
        <ol className={LIST_DECIMAL_CN}>
          <li>
            {t(
              '持有门槛：用户至少持有 1 个该演员 NFT，才能与该 AI 数字人开始聊天互动。持有越多 → 分润越多。',
            )}
          </li>
          <li>
            {t('分润比例绑定：创作者铸造演员 NFT 时，必须填写两项关键信息：')}
            <ol className="list-[lower-alpha] space-y-0 ps-6 md:ps-[30px]">
              <li>{t('绑定哪一部剧 NFT')}</li>
              <li>{t('该剧分给该演员 NFT 的收入比例（如 5%）')}</li>
            </ol>
          </li>
          <li>
            {t(
              '总分润上限：一部剧分给所有绑定演员 NFT 的总比例不能超过创作者收益上限（70%）。',
            )}
          </li>
          <li>{t('创作者主推机制：想捧红某个演员，可给该演员更高比例。')}</li>
        </ol>
      </section>

      <section className="space-y-3">
        <h3 className={SUBHEADING_CN}>{t('8.3 演员 NFT 的两条收入来源')}</h3>
        <ul className={LIST_DISC_CN}>
          <li>
            {t(
              '来源 A · 剧集分润：剧集付费收入中，按铸造时设定的比例分给该演员 NFT 池。',
            )}
          </li>
          <li>
            {t(
              '来源 B · AI 互动收入：所有用户与该 AI 数字人的聊天打赏、付费消费收入。',
            )}
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h3 className={SUBHEADING_CN}>{t('8.4 演员 NFT 收益分配逻辑')}</h3>
        <ul className={LIST_DISC_CN}>
          <li>
            {t('创作者与所有 NFT 持有者按"持有数量比例"分享上述两类收入。')}
          </li>
          <li>
            {t(
              '不计算好感度：好感度只是单个用户与 AI 之间的私人关系，不影响 NFT 分润。',
            )}
          </li>
          <li>
            {t(
              '二级市场差价：创作者和持有者的额外增值来自二级市场 NFT 交易差价（IP 长期价值升值）。',
            )}
          </li>
        </ul>
      </section>

      <p className="text-base leading-[26px] tracking-[-0.1px] text-muted-foreground md:text-xl md:leading-9 md:tracking-[-0.08px]">
        {t(
          '类比：每个 AI 演员 NFT 相当于一个"明星 IP 股份"。这个明星参与一部剧，分润比例就是合约里写死的；明星持续接戏（绑定更多剧）→ 收入持续增长 → NFT 价格在二级市场体现。',
        )}
      </p>
    </article>
  );
}
