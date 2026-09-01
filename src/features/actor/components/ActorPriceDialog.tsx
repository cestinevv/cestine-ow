import { useTranslation } from 'react-i18next';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';

import IconX from '@/assets/svg/IconX';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
  formatActorPriceCeilDisplay,
  formatActorTailPriceDisplay,
} from '@/features/actor/actorFormat';
import {
  type ActorPricingMode,
  getActorBondingCurvePrice,
  getActorPricingModeLabel,
  isFixedActorPricingMode,
} from '@/features/actor/actorPricing';
import { cn, formatNumber } from '@/utils';

type ActorPriceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  signedCount: number;
  maxSupply: number;
  initialPrice: number;
  currentPrice: number;
  pricingMode?: ActorPricingMode;
};

type PriceCurvePoint = {
  signed: number;
  price: number;
};

function buildPriceCurveData(
  initialPrice: number,
  maxSupply: number,
): PriceCurvePoint[] {
  const total = Math.max(1, maxSupply);
  return Array.from({ length: 81 }, (_, index) => {
    const signed = Math.round((total * index) / 80);
    return {
      signed,
      price: getActorBondingCurvePrice(initialPrice, signed, total),
    };
  });
}

export function ActorPriceCurveChart({
  signedCount,
  maxSupply,
  initialPrice,
  currentPrice,
  className,
}: {
  signedCount: number;
  maxSupply: number;
  initialPrice: number;
  currentPrice: number;
  className?: string;
}) {
  const { t } = useTranslation();
  const normalizedMaxSupply = Math.max(1, maxSupply);
  const supplyTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) =>
    Math.round(normalizedMaxSupply * ratio),
  );
  const finalPrice = getActorBondingCurvePrice(
    initialPrice,
    Math.max(0, normalizedMaxSupply - 1),
    normalizedMaxSupply,
  );
  const yTicks = [0, initialPrice, finalPrice / 2, finalPrice].filter(
    (value, index, array) => value >= 0 && array.indexOf(value) === index,
  );
  const chartData = buildPriceCurveData(initialPrice, normalizedMaxSupply);
  const normalizedSignedCount = Math.min(
    Math.max(0, signedCount),
    normalizedMaxSupply,
  );

  return (
    <div className={cn('flex w-full items-stretch gap-3 md:gap-4', className)}>
      <div className="flex h-[222px] w-3 shrink-0 items-center justify-center">
        <span className="-rotate-90 whitespace-nowrap text-[10px] leading-3 tracking-[0.08px] text-muted-foreground">
          {t('价格（USDC）')}
        </span>
      </div>
      <div className="relative h-[222px] min-w-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 12, right: 28, bottom: 24, left: 0 }}
          >
            <CartesianGrid
              vertical={false}
              stroke="var(--actor-chart-grid)"
              strokeWidth={1}
            />
            <XAxis
              dataKey="signed"
              type="number"
              domain={[0, normalizedMaxSupply]}
              ticks={supplyTicks}
              axisLine={false}
              tickLine={false}
              tickMargin={8}
              interval={0}
              padding={{ left: 0, right: 12 }}
              tick={{ fill: 'var(--actor-chart-tick)', fontSize: 10 }}
              tickFormatter={(value) => formatNumber(value, 0)}
              label={{
                value: t('已签约数'),
                position: 'insideBottom',
                offset: -4,
                dy: 6,
                fill: 'var(--actor-chart-label)',
                fontSize: 10,
              }}
            />
            <YAxis
              type="number"
              domain={[0, finalPrice]}
              ticks={yTicks}
              axisLine={false}
              tickLine={false}
              width={44}
              tick={{ fill: 'var(--actor-chart-tick)', fontSize: 10 }}
              tickFormatter={(value) => formatNumber(value, 2)}
            />
            <Line
              type="monotone"
              dataKey="price"
              stroke="var(--actor-curve-accent)"
              strokeWidth={1.5}
              dot={false}
              activeDot={false}
              isAnimationActive={false}
            />
            <ReferenceLine
              x={normalizedSignedCount}
              stroke="var(--onestory-brand-red)"
              strokeWidth="1"
              strokeDasharray="4 4"
              ifOverflow="extendDomain"
            />
            <ReferenceLine
              y={currentPrice}
              stroke="var(--onestory-brand-red)"
              strokeWidth="1"
              strokeDasharray="4 4"
              ifOverflow="extendDomain"
            />
            <ReferenceDot
              x={normalizedSignedCount}
              y={currentPrice}
              r={4}
              fill="var(--onestory-brand-red)"
              stroke="none"
              ifOverflow="extendDomain"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function ActorPriceDialog({
  open,
  onOpenChange,
  signedCount,
  maxSupply,
  initialPrice,
  currentPrice,
  pricingMode,
}: ActorPriceDialogProps) {
  const { t } = useTranslation();
  const isFixedPricing = isFixedActorPricingMode(pricingMode);
  const chartInitialPrice = initialPrice > 0 ? initialPrice : 0.5;
  const chartMaxSupply = maxSupply > 0 ? maxSupply : 5000;
  const chartCurrentPrice =
    currentPrice > 0
      ? currentPrice
      : getActorBondingCurvePrice(
          chartInitialPrice,
          signedCount,
          chartMaxSupply,
        );
  const fixedNotes = [
    t('发行者设定固定价格后，所有签约均按此价格结算'),
    t('不会因已签约数增加而价格上涨'),
    t('适合希望锁定成本的买家'),
  ];
  const tailPrice = getActorBondingCurvePrice(
    chartInitialPrice,
    Math.max(0, chartMaxSupply - 1),
    chartMaxSupply,
  );
  const remainingCount = Math.max(0, chartMaxSupply - signedCount);
  const curveStats = [
    {
      label: t('初始价格'),
      value: `${formatNumber(chartInitialPrice, 2)} USDC`,
    },
    {
      label: t('当前价格'),
      value: `${formatActorPriceCeilDisplay(chartCurrentPrice)} USDC`,
    },
    {
      label: t('尾价'),
      value: `${formatActorTailPriceDisplay(tailPrice)} USDC`,
    },
    { label: t('总发行量'), value: formatNumber(chartMaxSupply, 0) },
    { label: t('已签约'), value: formatNumber(signedCount, 0) },
    { label: t('剩余'), value: formatNumber(remainingCount, 0) },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        bodyScroll
        bare
        className={cn(
          'max-h-[90dvh] w-full overflow-y-auto border-0 bg-transparent p-0 shadow-none md:max-w-[600px]',
        )}
      >
        <div className="flex w-full flex-col gap-8 rounded-t-3xl bg-background p-6 md:rounded-2xl">
          <header className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <DialogTitle className="text-lg leading-[26px] font-bold tracking-[-0.04px] text-foreground">
                {t(getActorPricingModeLabel(pricingMode))}
              </DialogTitle>
              <p className="text-xs leading-4 tracking-[0.04px] text-muted-foreground">
                {isFixedPricing
                  ? t(
                      '该角色 IP 采用固定价格模式，每个角色都以统一价格签约，销量变化不影响价格',
                    )
                  : t('价格按联合曲线公式随已签约数自动上涨，早期签约更优惠')}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={t('关闭')}
              onClick={() => onOpenChange(false)}
              className="-mr-2 -mt-1 size-8 rounded-full text-foreground"
            >
              <IconX className="size-6" />
            </Button>
          </header>

          {isFixedPricing ? (
            // Figma 7371:72751 — story-bg #f8f9fb → points-page-surface-muted（深色与弹层同色）
            <div className="rounded-xl bg-points-page-surface-muted px-4 py-3 text-sm leading-5 text-foreground">
              {fixedNotes.map((note) => (
                <p key={note}>• {note}</p>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {/* Figma 7371:72750 — 提示条 Page&Sheet/secondary */}
              <p className="rounded-md bg-muted px-2 py-1 text-xs leading-4 tracking-[0.04px] text-foreground">
                {t(
                  '初始价格不代表平台估值，曲线上涨不代表二级价格上涨，平台不承诺收益。',
                )}
              </p>
              {/* 公式色与发行信息面板一致：actor-issue-formula #9b0016 */}
              <p className="text-sm leading-5 font-medium text-actor-issue-formula">
                {t('公式：价格 = 初始价格 × 5^(已签约数 ÷ 发行总量)')}
              </p>
              <ActorPriceCurveChart
                signedCount={signedCount}
                maxSupply={chartMaxSupply}
                initialPrice={chartInitialPrice}
                currentPrice={chartCurrentPrice}
              />
              <div className="flex items-center justify-center gap-11 text-sm leading-5 text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <span className="size-[9px] rounded-full bg-actor-curve-accent" />
                  {t('价格曲线')}
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="size-[9px] rounded-full bg-onestory-brand-red" />
                  {t('当前位置')}
                </span>
              </div>
              {/* 统计卡：浅 story-bg / 深 secondary（muted #212225） */}
              <div className="grid grid-cols-3 gap-x-2 gap-y-2">
                {curveStats.map((item) => (
                  <div
                    key={item.label}
                    className="flex min-w-0 flex-col items-center rounded-xl bg-muted px-2 py-2"
                  >
                    <span className="text-xs leading-4 text-muted-foreground">
                      {item.label}
                    </span>
                    <strong className="truncate text-sm leading-5 font-medium text-foreground">
                      {item.value}
                    </strong>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
