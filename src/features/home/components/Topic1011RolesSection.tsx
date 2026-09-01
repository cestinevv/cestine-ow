import { useTranslation } from 'react-i18next';

import { ContentContainer } from '@/components/common/ContentContainer';
import { cn } from '@/utils';

import { topic1011Media } from '../topic1011Media';

const ROLES = [
  {
    image: topic1011Media.roleKey,
    roleKey: '关键角色',
    titleKey: '大鹏 · 金字塔',
    descKey:
      '1011 中毫发无伤、甚至受益的一方。它未必真的作恶，但它的沉默与体量本身，就是最大的戏剧张力。',
  },
  {
    image: topic1011Media.roleVictim,
    roleKey: '受害者',
    titleKey: '16 万爆仓者',
    descKey: '被清算的普通人',
  },
  {
    image: topic1011Media.roleSurvivor,
    roleKey: '幸存者',
    titleKey: '渊流堡',
    descKey: '毫发无伤的堡垒',
  },
  {
    image: topic1011Media.roleWitness,
    roleKey: '见证者',
    titleKey: '举烛者',
    descKey: '记录并讲述的人',
  },
] as const;

export function Topic1011RolesSection() {
  const { t } = useTranslation();

  return (
    <section
      className={cn(
        // Layout
        'relative w-full overflow-hidden',
        // Visual
        'bg-topic-1011-surface',
      )}
    >
      <img
        src={topic1011Media.snowflake}
        alt=""
        className="pointer-events-none absolute top-16 left-10 hidden size-[71px] md:block"
      />
      <img
        src={topic1011Media.snowflake}
        alt=""
        className="pointer-events-none absolute right-8 bottom-16 hidden size-[89px] md:block"
      />

      <ContentContainer
        className={cn(
          // Layout
          'relative z-10 flex flex-col items-center',
          // Spacing — 移动 py-8 gap-4；桌面 gap-16 py-16
          'gap-4 py-8',
          'md:gap-16 md:py-16',
        )}
      >
        <header className="flex w-full flex-col items-center gap-3 md:gap-4">
          <p
            className={cn(
              'w-full text-center font-bold text-foreground',
              'text-sm leading-5',
              'md:text-xl md:leading-7 md:font-medium',
            )}
          >
            {t('叙事角色')}
          </p>
          <h2
            className={cn(
              'w-full text-center font-bold text-foreground',
              'text-lg leading-[26px] tracking-[-0.04px]',
              'md:text-[40px] md:leading-none md:tracking-normal',
            )}
          >
            {t('1011 不需要虚构 角色早已就位')}
          </h2>
          <p
            className={cn(
              'w-full text-center text-muted-foreground',
              'text-sm leading-5',
              'md:text-xl md:leading-7',
            )}
          >
            {t(
              '一个好故事需要关键角色、受害者、幸存者和讲述者。而 1011 的真实历史，已经把这四个角色摆在了所有人面前—— 用户上传的每一部剧集，都在从其中某个视角讲述',
            )}
          </p>
        </header>

        <ul className="grid w-full grid-cols-1 gap-4 md:grid-cols-4">
          {ROLES.map((role) => (
            <li
              key={role.roleKey}
              className={cn(
                // Layout
                'flex flex-col overflow-hidden',
                // Spacing
                'gap-0 md:gap-4',
                // Visual — 移动圆角 12；桌面 24
                'rounded-xl bg-card md:rounded-3xl',
              )}
            >
              {/* Figma 帧 2× 导出 848×692，与 aspect-[424/346] 同比例 */}
              <div className="relative aspect-[424/346] w-full overflow-hidden rounded-t-2xl">
                <img
                  src={role.image}
                  alt=""
                  width={424}
                  height={346}
                  className="absolute inset-0 size-full object-cover object-center"
                />
              </div>
              <div
                className={cn(
                  // Layout
                  'flex w-full flex-col items-start text-left',
                  // Spacing
                  'gap-2 p-4 md:gap-3',
                )}
              >
                <p
                  className={cn(
                    'font-medium text-foreground',
                    'text-xs leading-4 tracking-[0.04px]',
                    'md:text-base md:leading-6 md:tracking-normal',
                  )}
                >
                  {t(role.roleKey)}
                </p>
                <h3
                  className={cn(
                    'font-bold text-foreground',
                    'text-base leading-6',
                    'md:text-2xl md:leading-[30px]',
                  )}
                >
                  {t(role.titleKey)}
                </h3>
                <p
                  className={cn(
                    'text-muted-foreground',
                    'text-sm leading-5',
                    'md:text-base md:leading-6',
                  )}
                >
                  {t(role.descKey)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </ContentContainer>
    </section>
  );
}
