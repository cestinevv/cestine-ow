import { useTranslation } from 'react-i18next';

import whitepaperCardMyth from '@/assets/image/whitepaper/whitepaper-card-myth.png';
import whitepaperCardReligion from '@/assets/image/whitepaper/whitepaper-card-religion.png';
import whitepaperCardTech from '@/assets/image/whitepaper/whitepaper-card-tech.png';
import { ContentContainer } from '@/components/common/ContentContainer';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils';

import { useWhitepaperTocNavigation } from '../hooks/useWhitepaperTocNavigation';
import {
  WHITEPAPER_HEADER_KEYS,
  WHITEPAPER_HEADER_SECTION_IDS,
  WHITEPAPER_SECTION_IDS,
  WHITEPAPER_TOC_KEYS,
} from '../whitepaperToc';
import { WhitepaperChapter07ProjectPositioning } from './chapters/WhitepaperChapter07ProjectPositioning';
import { WhitepaperChapter08RoleEcosystem } from './chapters/WhitepaperChapter08RoleEcosystem';
import { WhitepaperChapter09CashIncome } from './chapters/WhitepaperChapter09CashIncome';
import { WhitepaperChapter10WitnessRebatePool } from './chapters/WhitepaperChapter10WitnessRebatePool';
import { WhitepaperChapter11TokenAllocation } from './chapters/WhitepaperChapter11TokenAllocation';
import { WhitepaperChapter12TokenRelease } from './chapters/WhitepaperChapter12TokenRelease';
import { WhitepaperChapter13TokenIncentive } from './chapters/WhitepaperChapter13TokenIncentive';
import { WhitepaperChapter14AiInteraction } from './chapters/WhitepaperChapter14AiInteraction';
import { WhitepaperChapter15Burn } from './chapters/WhitepaperChapter15Burn';
import { WhitepaperChapter16Closing } from './chapters/WhitepaperChapter16Closing';
import { WhitepaperMobileToc } from './WhitepaperMobileToc';

const CARDS = [
  {
    image: whitepaperCardMyth,
    titleKey: '神话',
  },
  {
    image: whitepaperCardReligion,
    titleKey: '宗教',
  },
  {
    image: whitepaperCardTech,
    titleKey: '技术',
  },
] as const;

const AOS_BASE_DURATION = 700;
const AOS_DELAY_STEP = 100;
const AOS_ARTICLE_DELAY_STEP = 60;

export function WhitepaperBodySection() {
  const { t } = useTranslation();
  const {
    activeTocIndex,
    activeDotTop,
    tocNavRef,
    tocListRef,
    tocItemRefs,
    handleNavigateToSection,
  } = useWhitepaperTocNavigation();

  const handleTocNavigate = (index: number) => () => {
    handleNavigateToSection(index);
  };

  return (
    <section
      className={cn(
        // Layout & Positioning
        'w-full',
        // Spacing
        'py-12 md:py-26',
        // Visual
        'bg-background',
      )}
      data-aos="fade-up"
      data-aos-duration={String(AOS_BASE_DURATION)}
    >
      <ContentContainer>
        <div
          className={cn(
            // Layout & Positioning
            'mx-auto flex w-full flex-col',
            // Sizing — 正文 755 + 间距 72 + 目录 385
            'md:max-w-[1212px]',
            // Spacing
            'gap-10 md:gap-[72px]',
          )}
        >
          <header
            className="space-y-3 md:space-y-3"
            data-aos="fade-up"
            data-aos-duration={String(AOS_BASE_DURATION)}
            data-aos-delay={String(AOS_DELAY_STEP)}
          >
            <p
              id={WHITEPAPER_HEADER_SECTION_IDS[0]}
              className="text-xl font-bold leading-normal tracking-[-0.12px] text-foreground md:text-[30px]"
            >
              {t(WHITEPAPER_HEADER_KEYS[0])}
            </p>
            <p
              id={WHITEPAPER_HEADER_SECTION_IDS[1]}
              className="text-xl font-bold leading-normal tracking-[-0.12px] text-foreground md:text-[30px]"
            >
              {t(WHITEPAPER_HEADER_KEYS[1])}
            </p>
          </header>

          <div
            className={cn(
              // Layout & Positioning
              'flex flex-col md:flex-row md:items-start',
              // Spacing
              'gap-8 md:gap-[72px]',
            )}
          >
            <div
              className={cn(
                // Layout & Positioning
                'flex min-w-0 flex-col',
                // Sizing
                'w-full md:w-[755px] md:max-w-[755px] md:shrink-0',
              )}
            >
              <WhitepaperMobileToc
                activeTocIndex={activeTocIndex}
                onNavigate={handleNavigateToSection}
              />

              <section
                aria-label={t('StoryFun白皮书')}
                className={cn(
                  // Layout & Positioning
                  'min-w-0',
                  // Spacing
                  'space-y-16 md:space-y-[72px]',
                )}
              >
                <article
                  id={WHITEPAPER_SECTION_IDS[0]}
                  className="space-y-8"
                  data-aos="fade-up"
                  data-aos-duration={String(AOS_BASE_DURATION)}
                  data-aos-delay={String(AOS_DELAY_STEP)}
                >
                  <h2 className="text-lg font-bold leading-[26px] tracking-[-0.04px] text-foreground md:text-[30px] md:leading-9 md:tracking-[-0.12px]">
                    {t('一、缘起')}
                  </h2>
                  <div className="whitespace-pre-wrap text-base leading-[26px] tracking-[-0.1px] text-foreground md:text-xl md:leading-9 md:tracking-[-0.08px]">
                    {t(`在人类历史中，有三种力量不断塑造文明结构：
1、神话——赋予世界意义
2、宗教——定义人该如何存在
3、技术——拓展人的能力

在大多数时代，这三者是分离的。但在今天，它们开始融合，形成一种新的结构：意义+存在+能力 = 可被重写的现实，与此同时，一个更底层的认知正在浮现：现实，不是被体验的。现实，是被叙事出来的。在 StoryFun 的世界观中：世界是由叙事结构一步步构成的。现实不是一条已经写好的轨道，而是一部正在被你参与创作的故事。你经历的每一刻是剧情。你记住的一切是片段。你做出的选择是分支，而你自己，就是这部故事的主视角。`)}
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    {CARDS.map((card, index) => (
                      <article
                        key={card.titleKey}
                        className={cn(
                          // Layout & Positioning
                          'flex flex-col items-center overflow-hidden',
                          // Spacing
                          'gap-6 pb-6',
                          // Visual
                          'rounded-2xl border border-border bg-background',
                        )}
                        data-aos="fade-up"
                        data-aos-duration={String(AOS_BASE_DURATION - 100)}
                        data-aos-delay={String(AOS_DELAY_STEP * (index + 1))}
                      >
                        <div className="aspect-437/255 w-full overflow-hidden">
                          <img
                            src={card.image}
                            alt={t(card.titleKey)}
                            className="size-full object-cover"
                            loading="lazy"
                            decoding="async"
                          />
                        </div>
                        <h3 className="text-xl leading-9 text-foreground">
                          {t(card.titleKey)}
                        </h3>
                      </article>
                    ))}
                  </div>
                </article>

                <article
                  id={WHITEPAPER_SECTION_IDS[1]}
                  className="space-y-8"
                  data-aos="fade-up"
                  data-aos-duration={String(AOS_BASE_DURATION)}
                  data-aos-delay={String(AOS_ARTICLE_DELAY_STEP * 2)}
                >
                  <h2 className="text-lg font-bold leading-[26px] tracking-[-0.04px] text-foreground md:text-[30px] md:leading-9 md:tracking-[-0.12px]">
                    {t('二、问题')}
                  </h2>
                  <p className="text-base leading-[26px] tracking-[-0.1px] text-foreground md:text-xl md:leading-9 md:tracking-[-0.08px]">
                    {t(
                      '人类最大的错觉，不是贫穷，不是无知，而是把自己当成角色，而不是作者。我们从小被训练去消费故事，理解故事，模仿故事，但我们缺失了最关键的一种能力：自我叙事的能力。过去的世界，叙事权本质是一个高度集中的系统：神话时代，神定义了命运，宗教时代，教义定义了意义，工业时代，社会定义了角色，媒体时代，平台定义了故事，在这样的系统中，人类逐渐变成了他人故事的观众、社会剧本的执行者、固定身份的承载体。于是我们借用他人的叙事来定义自我，在既定路径中重复存在，在比较与模仿中失去真实，我们不是没有故事，而是没有书写自己故事的权力。',
                    )}
                  </p>
                </article>

                <article
                  id={WHITEPAPER_SECTION_IDS[2]}
                  className="space-y-8"
                  data-aos="fade-up"
                  data-aos-duration={String(AOS_BASE_DURATION)}
                  data-aos-delay={String(AOS_ARTICLE_DELAY_STEP * 3)}
                >
                  <h2 className="text-lg font-bold leading-[26px] tracking-[-0.04px] text-foreground md:text-[30px] md:leading-9 md:tracking-[-0.12px]">
                    {t('三、转折点')}
                  </h2>
                  <p className="text-base leading-[26px] tracking-[-0.1px] text-foreground md:text-xl md:leading-9 md:tracking-[-0.08px]">
                    {t(
                      '今天，人类第一次具备一种能力：将叙事从被动体验转化为主动生成。这一转折由三种力量驱动：AI使得想象可以被即时生成，表达不再依赖专业能力，创作从稀缺资源变成普遍能力。Web3使得内容可以被确权，价值可以被分配，身份可以被主权化。协议化使得故事可以被模块化，叙事可以被组合，内容可以被演化，这三者叠加，不只是技术进步，而是将叙事权从系统回归个体。',
                    )}
                  </p>
                </article>

                <article
                  id={WHITEPAPER_SECTION_IDS[3]}
                  className="space-y-8"
                  data-aos="fade-up"
                  data-aos-duration={String(AOS_BASE_DURATION)}
                  data-aos-delay={String(AOS_ARTICLE_DELAY_STEP * 4)}
                >
                  <h2 className="text-lg font-bold leading-[26px] tracking-[-0.04px] text-foreground md:text-[30px] md:leading-9 md:tracking-[-0.12px]">
                    {t('四、StoryFun 的诞生')}
                  </h2>
                  <p className="text-base leading-[26px] tracking-[-0.08px] text-foreground md:text-xl md:leading-9">
                    {t(
                      'StoryFun 正是在这个历史节点诞生。但我们从一开始就拒绝一个更容易的路径：拒绝做一个更好的内容平台，拒绝做一个AI创作工具，拒绝做一个Web3娱乐应用，我们选择新的路径：重塑人类如何创造与理解自身存在的方式。StoryFun 的核心存在意义，不是让你创作内容，而是让你意识到：你本身，就是一个正在展开的叙事宇宙。我们要解决的本质问题，解构叙事垄断，并将存在的解释权归还给个体。',
                    )}
                  </p>
                </article>

                <article
                  id={WHITEPAPER_SECTION_IDS[4]}
                  className="space-y-8"
                  data-aos="fade-up"
                  data-aos-duration={String(AOS_BASE_DURATION)}
                  data-aos-delay={String(AOS_ARTICLE_DELAY_STEP * 5)}
                >
                  <h2 className="text-lg font-bold leading-[26px] tracking-[-0.04px] text-foreground md:text-[30px] md:leading-9 md:tracking-[-0.12px]">
                    {t('五、解决路径')}
                  </h2>
                  <p className="text-base leading-[26px] tracking-[-0.08px] text-foreground md:text-xl md:leading-9">
                    {t(
                      'StoryFun 通过三个层面的重构，实现这一转变：我们构建一个新的存在层，在这个层之上：现实可生成，身份可重写，命运可分叉，AI 的重新定义：AI ≠ 自动化工具，AI = 想象力的外部化。Web3 的重新定义：Web3 ≠ 金融系统，Web3 = 主权的编码系统。StoryFun 的重新定义：自我叙事变成可计算、可拥有、可进化。在 StoryFun 中，不再存在用户这一概念。取而代之的是四种叙事参与方式：创造者：主动书写自身的叙事，见证者：参与并验证他人叙事，共创者：进入叙事结构并进行改写，传播者：传播你值得的叙事。',
                    )}
                  </p>
                  <p className="text-base leading-[26px] tracking-[-0.08px] text-foreground md:text-xl md:leading-9">
                    {t(
                      '当 StoryFun 完成时，社会将发生三个根本性变化：内容的消失，因为一切表达都变成自我叙事。用户的消失，因为没有人再只是观看者。平台的消失，因为叙事成为底层协议。世界形态的变化：世界将从单一现实变为多重叙事宇宙网络。人类的变化：人类将从适应世界转变为创造世界，并开始问：我想创造怎样的故事？',
                    )}
                  </p>
                </article>

                <article
                  id={WHITEPAPER_SECTION_IDS[5]}
                  className="space-y-8"
                  data-aos="fade-up"
                  data-aos-duration={String(AOS_BASE_DURATION)}
                  data-aos-delay={String(AOS_ARTICLE_DELAY_STEP * 6)}
                >
                  <h2 className="text-lg font-bold leading-[26px] tracking-[-0.04px] text-foreground md:text-[30px] md:leading-9 md:tracking-[-0.12px]">
                    {t('六、愿景与使命')}
                  </h2>
                  <p className="text-base leading-[26px] tracking-[-0.08px] text-foreground md:text-xl md:leading-9">
                    {t(
                      'StoryFun是人类对自我存在的重写引擎，它真正的意义，不只是让人创造故事，而是让每一个人通过故事重新认识自己。在过去，我们通过他人的故事来理解世界，理解自身，我们观看故事、模仿角色，在既定叙事中定义自己，却很少真正意识到自己是谁。',
                    )}
                  </p>
                  <p className="text-base leading-[26px] tracking-[-0.08px] text-foreground md:text-xl md:leading-9">
                    {t(
                      '而StoryFun所做的，不是提供答案，而是让你不断看见：你是谁，你是可以被你自己创造的。我们的核心使命，是解放叙事权，并将定义意义的能力归还给个体。我们相信，你不仅是被创造的，同时你正在创造你自己；现实不是固定的，它由你的叙事不断生成；意义不是被发现的，它是被你亲手书写的。',
                    )}
                  </p>
                  <p className="text-base leading-[26px] tracking-[-0.08px] text-foreground md:text-xl md:leading-9">
                    {t(
                      '当你开始意识到这一点，你会发现你不是来理解这个世界的，你是来创造它的，你不再需要遵循别人的路径或模仿他人的故事，因为你本身就是故事的源头。',
                    )}
                  </p>
                  <p className="text-base leading-[26px] tracking-[-0.08px] text-foreground md:text-xl md:leading-9">
                    {t(
                      'StoryFun不是让你讲故事的地方，而是让你成为创造故事的人的系统，在这里，你的每一个选择都会打开新的分支，你的每一个行动都会生成新的现实，你的每一个当下都在重写你是谁，最终你会意识到，你的人生不是被别人安排的轨迹，而是一部正在被你不断创作的故事，而你，不仅是其中的某个角色，你是真正的主角，你是一切故事的源头。',
                    )}
                  </p>
                </article>

                <WhitepaperChapter07ProjectPositioning
                  id={WHITEPAPER_SECTION_IDS[6]}
                />
                <WhitepaperChapter08RoleEcosystem
                  id={WHITEPAPER_SECTION_IDS[7]}
                />
                <WhitepaperChapter09CashIncome id={WHITEPAPER_SECTION_IDS[8]} />
                <WhitepaperChapter10WitnessRebatePool
                  id={WHITEPAPER_SECTION_IDS[9]}
                />
                <WhitepaperChapter11TokenAllocation
                  id={WHITEPAPER_SECTION_IDS[10]}
                />
                <WhitepaperChapter12TokenRelease
                  id={WHITEPAPER_SECTION_IDS[11]}
                />
                <WhitepaperChapter13TokenIncentive
                  id={WHITEPAPER_SECTION_IDS[12]}
                />
                <WhitepaperChapter14AiInteraction
                  id={WHITEPAPER_SECTION_IDS[13]}
                />
                <WhitepaperChapter15Burn id={WHITEPAPER_SECTION_IDS[14]} />
                <WhitepaperChapter16Closing id={WHITEPAPER_SECTION_IDS[15]} />
              </section>
            </div>

            <aside
              className={cn(
                // Layout & Positioning
                'hidden min-h-0 shrink-0 flex-col md:sticky md:top-24 md:-mt-[168px] md:flex',
                // Sizing
                'w-full md:max-h-[calc(100svh-6rem)] md:w-[385px]',
                // Visual
                'rounded-2xl border border-border/40 bg-background md:overflow-hidden',
                // Spacing
                'p-6',
              )}
              data-aos="fade-left"
              data-aos-duration={String(AOS_BASE_DURATION)}
              data-aos-delay={String(AOS_DELAY_STEP * 2)}
            >
              <nav
                ref={tocNavRef}
                aria-label={t('白皮书目录')}
                className={cn(
                  // Layout & Positioning
                  'min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain',
                )}
              >
                <div
                  className={cn(
                    // Layout & Positioning
                    'flex items-start gap-6',
                  )}
                >
                  <div className="relative w-[9px] shrink-0 self-stretch">
                    <span
                      className="absolute inset-y-0 left-1/2 z-0 w-px -translate-x-1/2 bg-border"
                      aria-hidden
                    />
                    <span
                      className="absolute left-1/2 z-10 h-[13px] w-[5px] -translate-x-1/2 rounded-sm bg-foreground transition-[top] duration-300"
                      style={{ top: `${activeDotTop}px` }}
                      aria-hidden
                    />
                  </div>

                  <ul ref={tocListRef} className="flex min-w-0 flex-1 flex-col">
                    {WHITEPAPER_TOC_KEYS.map((item, index) => (
                      <li
                        key={item}
                        ref={(element) => {
                          tocItemRefs.current[index] = element;
                        }}
                        className="px-4 py-3"
                      >
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={handleTocNavigate(index)}
                          className={cn(
                            // Layout & Positioning
                            'h-auto justify-start',
                            // Spacing
                            'p-0',
                            // Visual
                            'text-base leading-9 whitespace-normal text-left',
                            // State
                            'hover:bg-transparent hover:text-foreground',
                            index === activeTocIndex
                              ? 'font-medium text-foreground'
                              : 'font-normal text-muted-foreground',
                          )}
                        >
                          {t(item)}
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              </nav>
            </aside>
          </div>
        </div>
      </ContentContainer>
    </section>
  );
}
