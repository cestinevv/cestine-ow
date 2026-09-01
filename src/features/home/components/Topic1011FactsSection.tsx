import { useTranslation } from 'react-i18next';

import IconTimelineDot from '@/assets/svg/IconTimelineDot';
import { ContentContainer } from '@/components/common/ContentContainer';
import { cn } from '@/utils';

import { topic1011Media } from '../topic1011Media';

const STATS = [
  { valueKey: '160 万', labelKey: '被清算地址' },
  { valueKey: '$21 亿', labelKey: '爆仓总额' },
  { valueKey: '6 小时', labelKey: '主要清算窗口' },
] as const;

const TIMELINE = [
  {
    id: 'oct9-hyperliquid',
    timeKey: '10月9日 04:40',
    eventKey: '某 Hyperliquid 账户存入 8000 万 USDC，建 BTC 空头',
  },
  {
    id: 'oct10-short',
    timeKey: '10月10日 20:49',
    eventKey: '建仓约 $4 亿 BTC 空头，特朗普发文前 1 分钟停止',
  },
  {
    id: 'tariff-drop',
    timeKey: '20:50',
    eventKey: '特朗普关税威胁 · BTC/ETH/美股同步下跌',
  },
  {
    id: 'liquidation-window',
    timeKey: '20:50–21:30',
    eventKey: '约 $69.3 亿爆仓，占总 70%（核心清算窗口）',
  },
  {
    id: 'liquidation-peak',
    timeKey: '21:15',
    eventKey: '清算峰值 · 一分钟 $32.1 亿仓位被强平',
  },
  {
    id: 'usde-below-peg',
    timeKey: '21:20–21:42',
    eventKey: 'USDe 在 Binance 低于 $1 · BTC/ETH 已近日低',
  },
  {
    id: 'usde-low',
    timeKey: '21:42–21:51',
    eventKey: 'USDe 最低 $0.65 · WBETH/BNSOL 折价 80–90%',
  },
  {
    id: 'usde-recovery',
    timeKey: '21:51 后',
    eventKey: 'USDe 恢复 · WBETH/BNSOL 逐步恢复锚定',
  },
  {
    id: 'binance-plan',
    timeKey: '10月11日',
    eventKey: 'Binance 公布 USDe/BNSOL/WBETH 赔偿方案',
  },
  {
    id: 'binance-payout',
    timeKey: '截至10月22日',
    eventKey: 'Binance 支付 $3.28 亿+ 直接赔偿',
  },
] as const;

export function Topic1011FactsSection() {
  const { t } = useTranslation();

  return (
    <section
      className={cn(
        // Layout & Positioning
        'relative w-full overflow-hidden',
        // Visual
        'bg-topic-1011-surface',
      )}
    >
      <ContentContainer
        className={cn(
          // Layout
          'relative z-10 flex flex-col items-center',
          // Spacing — 移动 py-8 gap-4；桌面 pt-120 gap-16
          'gap-4 py-8',
          'md:gap-16 md:pt-[120px] md:pb-16',
        )}
      >
        <header className="flex w-full flex-col items-center gap-3 md:gap-4">
          <p
            className={cn(
              'w-full text-center font-bold text-foreground',
              'text-sm leading-5',
              'md:text-xl md:leading-7 md:font-medium md:tracking-[-0.08px]',
            )}
          >
            {t('从事实到叙事')}
          </p>
          <h2
            className={cn(
              'w-full text-center font-bold text-foreground',
              'text-lg leading-[26px] tracking-[-0.04px]',
              'md:text-[40px] md:leading-none md:tracking-[-0.12px]',
            )}
          >
            {t('把真实事件发射为可传播的叙事 IP')}
          </h2>
          <p
            className={cn(
              'w-full text-center whitespace-pre-wrap text-muted-foreground',
              'text-sm leading-5',
              'md:text-xl md:leading-7 md:tracking-[-0.08px]',
            )}
          >
            {t('用故事解释世界运转的真相 但 1011 不是故事 是真实发生的一夜')}
          </p>
        </header>

        <div className="flex w-full flex-col gap-3 md:gap-6">
          {/* 移动端 2+1；桌面三列 */}
          <ul className="grid w-full grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
            {STATS.map((stat, index) => (
              <li
                key={stat.labelKey}
                className={cn(
                  // Layout
                  'flex items-center justify-center overflow-hidden',
                  // Spacing
                  'rounded-2xl p-4 md:rounded-3xl md:p-8',
                  // Visual
                  'bg-card',
                  // 第三卡移动端通栏
                  index === 2 && 'col-span-2 md:col-span-1',
                )}
              >
                <div className="flex w-full flex-col items-start gap-1.5 text-center text-foreground">
                  <p
                    className={cn(
                      'w-full font-bold',
                      'text-lg leading-[26px] tracking-[-0.04px]',
                      'md:text-[32px] md:leading-none md:tracking-[-0.12px]',
                    )}
                  >
                    {t(stat.valueKey)}
                  </p>
                  <p
                    className={cn(
                      'w-full',
                      'text-sm leading-5',
                      'md:text-[17px] md:leading-[25px]',
                    )}
                  >
                    {t(stat.labelKey)}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <div
            className={cn(
              // Layout — <lg 图上时间轴下；lg+ 时间轴左图右（窄屏左右会挤）
              'flex flex-col overflow-hidden rounded-3xl bg-card',
              'lg:flex-row lg:items-center lg:gap-[clamp(1.5rem,2.5vw,2.25rem)] lg:pl-8',
            )}
          >
            {/* 默认图在上；lg+ 排到右侧 */}
            <div
              className={cn(
                // Layout
                'w-full min-w-0',
                // Sizing — lg+ 与左栏对半
                'lg:order-2 lg:max-w-[844px] lg:flex-1 lg:basis-0',
              )}
            >
              <div
                className={cn(
                  // Layout
                  'relative w-full overflow-hidden',
                  // Sizing
                  'aspect-[844/560]',
                  // Visual
                  'rounded-xl md:rounded-2xl',
                )}
              >
                <img
                  src={topic1011Media.factsTimelineArt}
                  alt=""
                  className="absolute inset-0 size-full object-cover"
                />
              </div>
            </div>

            <ol
              className={cn(
                // Layout
                'relative flex w-full min-w-0 flex-col',
                // Spacing — 移动 p-4 gap-3；md+ 流体间距
                'gap-3 p-4',
                'md:gap-[clamp(1rem,1.6vw,1.5rem)] md:p-[clamp(1.25rem,2vw,2rem)]',
                'lg:order-1 lg:max-w-[832px] lg:flex-1 lg:basis-0',
              )}
            >
              <span
                aria-hidden
                className={cn(
                  // Layout — 对齐圆点中心
                  'absolute w-px bg-border',
                  'top-7 bottom-7 left-[21px]',
                  'md:top-11 md:bottom-11 md:left-[38px]',
                )}
              />
              {TIMELINE.map((item) => (
                <li
                  key={item.id}
                  className={cn(
                    // Layout — 移动：时间在上、事件在下；md+：横排
                    'relative flex min-w-0 flex-col gap-2',
                    'md:flex-row md:items-center md:gap-[clamp(1.5rem,2.8vw,2.75rem)]',
                  )}
                >
                  <div
                    className={cn(
                      // Layout
                      'flex shrink-0 items-center gap-4',
                      // Sizing — md+ 固定列宽对齐
                      'md:w-40',
                    )}
                  >
                    <IconTimelineDot className="relative z-10 size-3 shrink-0 text-foreground" />
                    <time
                      className={cn(
                        // Visual — 移动 12/16 secondary；md+ 流体
                        'whitespace-nowrap font-normal',
                        'text-xs leading-4 tracking-[0.04px] text-muted-foreground',
                        'md:text-[clamp(15px,1.15vw,20px)] md:leading-[1.4] md:tracking-[-0.08px] md:text-foreground',
                      )}
                    >
                      {t(item.timeKey)}
                    </time>
                  </div>
                  <p
                    className={cn(
                      // Layout
                      'min-w-0 flex-1',
                      // Spacing — 移动与圆点+gap 对齐（12+16=28）
                      'pl-7 md:pl-0',
                      // Visual
                      'font-medium text-foreground',
                      'text-[15px] leading-[22px]',
                      'md:text-[clamp(15px,1.15vw,20px)] md:leading-[1.4] md:tracking-[-0.08px]',
                    )}
                  >
                    {t(item.eventKey)}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </ContentContainer>
    </section>
  );
}
