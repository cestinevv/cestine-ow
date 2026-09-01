import { Trans, useTranslation } from 'react-i18next';

import { cn } from '@/utils';

type Props = {
  id: string;
};

const HEADING_H2 = cn(
  'text-lg font-bold leading-[26px] tracking-[-0.04px] text-foreground',
  'md:text-[30px] md:leading-9 md:tracking-[-0.12px]',
);

const BODY_CN = cn(
  'text-base leading-[26px] tracking-[-0.1px] text-foreground',
  'md:text-xl md:leading-9 md:tracking-[-0.08px]',
);

const CLOSING_BODY_KEY =
  'StoryFun 通过 <0>四角色协同 + AI 演员 NFT 双层激励 + USDC 与 STORY 双轨经济</0> ，构建一个让创作（含二创）、观看、传播、IP 衍生四个维度都能被精准激励、被精准分润的 Web3 剧集生态。' as const;

export function WhitepaperChapter16Closing({ id }: Props) {
  const { t } = useTranslation();

  return (
    <article
      id={id}
      className="space-y-8"
      data-aos="fade-up"
      data-aos-duration="600"
      data-aos-delay="100"
    >
      <h2 className={HEADING_H2}>{t('十六、结语')}</h2>

      <p className={BODY_CN}>
        <Trans
          t={t}
          i18nKey={CLOSING_BODY_KEY}
          components={[<strong key="closing-emphasis" className="font-bold" />]}
        />
      </p>
    </article>
  );
}
