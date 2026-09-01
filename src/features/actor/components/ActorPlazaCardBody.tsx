import { useTranslation } from 'react-i18next';

import { UserProfileAvatarLink } from '@/components/common/UserProfileAvatarLink';
import { Button } from '@/components/ui/button';
import { formatActorPriceCeilDisplay } from '@/features/actor/actorFormat';
import { formatGameActorHourlyPaymentValue } from '@/features/game/formatGameActorStoryRate';
import { cn, formatCreatorAtHandle, formatNumber } from '@/utils';

type ActorPlazaCardBodyProps = {
  presentation: 'plaza' | 'search';
  name: string;
  bio: string;
  lv1Rate: number | undefined;
  currentPrice: number;
  floorPriceLabel: string;
  isSoldOut: boolean;
  remainingCount: number;
  creatorName?: string;
  creatorUserId?: string;
  onLv1RateClick: () => void;
  onSignClick: () => void;
  onTradeClick: () => void;
};

const RATE_BOX_CLASS = cn(
  'flex h-9 w-full min-w-0 items-center justify-between gap-3 rounded-[10px] bg-muted px-4 py-2',
  'text-left hover:bg-muted/80',
);

const RATE_LABEL_CLASS = cn(
  'shrink-0 text-xs leading-4 font-normal tracking-[0.04px] text-foreground',
  'underline decoration-dotted decoration-from-font',
  '[text-decoration-skip-ink:none] [text-underline-position:from-font]',
);

export function ActorPlazaCardBody({
  presentation,
  name,
  bio,
  lv1Rate,
  currentPrice,
  floorPriceLabel,
  isSoldOut,
  remainingCount,
  creatorName,
  creatorUserId,
  onLv1RateClick,
  onSignClick,
  onTradeClick,
}: ActorPlazaCardBodyProps) {
  const { t } = useTranslation();
  const creatorHandle = creatorName
    ? formatCreatorAtHandle(creatorName)
    : undefined;

  return (
    <div className="flex shrink-0 flex-col gap-2 p-3">
      <header className="flex min-w-0 flex-col gap-2">
        <h2 className="truncate text-base leading-6 font-bold text-foreground">
          {name}
        </h2>
        {presentation === 'search' ? (
          <p className="truncate text-xs leading-4 tracking-[0.04px] text-muted-foreground">
            {bio}
          </p>
        ) : null}
      </header>

      <Button
        type="button"
        variant="ghost"
        onClick={onLv1RateClick}
        className={RATE_BOX_CLASS}
      >
        <span className={RATE_LABEL_CLASS}>{t('片酬')}</span>
        <span className="flex min-w-0 items-baseline justify-center gap-0.5">
          <strong className="truncate text-[13px] leading-4.5 font-medium text-foreground">
            {formatGameActorHourlyPaymentValue(lv1Rate)}
          </strong>
          <span className="text-[10px] leading-3 font-normal tracking-[0.08px] text-muted-foreground">
            STORY/h
          </span>
        </span>
      </Button>

      <Button
        type="button"
        size="lg"
        variant={isSoldOut ? 'outline' : 'default'}
        onClick={isSoldOut ? onTradeClick : onSignClick}
        className={cn(
          'h-11 w-full rounded-xl px-4 py-2.5 text-sm leading-5 font-bold',
          isSoldOut
            ? 'border-foreground bg-transparent text-foreground hover:bg-muted/50'
            : 'bg-foreground text-background hover:bg-foreground/90',
        )}
      >
        {isSoldOut
          ? `${floorPriceLabel} · ${t('交易')}`
          : `${formatActorPriceCeilDisplay(currentPrice)} USDC · ${t('签约')}`}
      </Button>

      <footer className="flex min-w-0 items-center justify-between overflow-hidden text-xs leading-4 tracking-[0.04px] text-muted-foreground">
        <span className="shrink-0">
          {isSoldOut
            ? t('已售罄')
            : t('剩余 {{count}}', {
                count: formatNumber(remainingCount, 0),
              })}
        </span>
        {creatorHandle ? (
          <UserProfileAvatarLink
            userId={creatorUserId}
            className={cn(
              'w-2/5 shrink-0 text-xs leading-4 tracking-[0.04px] text-muted-foreground',
              'hover:text-foreground',
            )}
          >
            <span className="block w-full min-w-0 truncate text-right">
              {creatorHandle}
            </span>
          </UserProfileAvatarLink>
        ) : null}
      </footer>
    </div>
  );
}
