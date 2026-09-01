import { useTranslation } from 'react-i18next';

type Props = {
  id: string;
};

const BULLETS = [
  '上传与创作剧集（含原创与二创）',
  '观看、付费、点赞、收藏、评分、质押支持剧集',
  '与剧集衍生的 AI 演员 NFT 互动（聊天、打赏、付费消费、积累好感度）',
  '通过邀请等方式参与生态共建',
] as const;

export function WhitepaperChapter07ProjectPositioning({ id }: Props) {
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
        {t('七、项目定位')}
      </h2>
      <div className="space-y-4 text-base leading-[26px] tracking-[-0.1px] text-foreground md:text-xl md:leading-9 md:tracking-[-0.08px]">
        <p>
          {t('StoryFun 是一个基于AI 剧集 + AI 演员 IP 平台。用户可在平台上：')}
        </p>
        <ul className="list-disc space-y-0 ps-6 md:ps-[30px]">
          {BULLETS.map((bullet) => (
            <li key={bullet}>{t(bullet)}</li>
          ))}
        </ul>
        <p>
          {t(
            '平台通过 STORY 代币 + USDC 双轨经济，将创作者、观众、质押者、邀请人，以及 AI 演员 NFT 持有者全部纳入精准激励网络。',
          )}
        </p>
      </div>
    </article>
  );
}
