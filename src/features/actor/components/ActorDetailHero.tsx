import { AlertTriangleIcon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { ActorCollectionResponse } from '@/api/__generated__/story/model/actorCollectionResponse';
import { IconAvatarDefault } from '@/assets/svg/IconAvatarDefault';
import { UserProfileRouteLink } from '@/components/common/UserProfileRouteLink';
import { Button } from '@/components/ui/button';
import {
  formatActorFloorPriceDisplay,
  formatActorIpDisplay,
  formatActorPriceCeilDisplay,
  getActorPlazaCardDisplay,
  resolveActorAvatarUrl,
  resolveActorFloorPriceUsdc,
} from '@/features/actor/actorFormat';
import { ActorIpPowerDialog } from '@/features/actor/components/ActorIpPowerDialog';
import { ActorMintDialogs } from '@/features/actor/components/ActorMintDialogs';
import { ActorRiskIpDialog } from '@/features/actor/components/ActorRiskIpDialog';
import { ContentBadge } from '@/features/badge/ContentBadge';
import {
  formatPowerFactor,
  getActorIpPowerBreakdown,
} from '@/features/mining/miningPower';
import { useAppLogin } from '@/hooks/useAppLogin';
import { useNotifyInsufficientUsdc } from '@/hooks/useNotifyInsufficientUsdc';
import useGlobalStore from '@/stores/global';
import { cn, isGreaterThanOrEqual, minus } from '@/utils';
import { readSnowflakeId } from '@/utils/snowflakeId';

type ActorDetailHeroProps = {
  detail: ActorCollectionResponse;
};

function ActorDetailBadge({
  children,
  className,
  onClick,
  profileUserId,
}: {
  children: string;
  className?: string;
  onClick?: () => void;
  profileUserId?: string;
}) {
  const classNames = cn(
    'inline-block min-w-0 max-w-full truncate rounded-full bg-muted px-2 py-1 text-xs leading-4 tracking-[0.04px] text-foreground',
    className,
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          classNames,
          'text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        )}
      >
        {children}
      </button>
    );
  }

  if (profileUserId) {
    return (
      <UserProfileRouteLink
        userId={profileUserId}
        className={cn(
          classNames,
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        )}
      >
        {children}
      </UserProfileRouteLink>
    );
  }

  return <span className={classNames}>{children}</span>;
}

function ActorDetailPayMetric({
  label,
  value,
  onClick,
}: {
  label: string;
  value: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="text-xs leading-4 tracking-[0.04px] text-muted-foreground">
        {label}
      </span>
      <span className="inline-flex items-baseline gap-1">
        <strong className="text-[17px] leading-[25px] font-bold tracking-[-0.03px] text-foreground">
          {value}
        </strong>
        <span className="text-xs leading-4 tracking-[0.04px] text-muted-foreground">
          STORY/h
        </span>
      </span>
    </button>
  );
}

export function ActorDetailHero({ detail }: ActorDetailHeroProps) {
  const { t } = useTranslation();
  const { login } = useAppLogin();
  const isLogin = useGlobalStore((state) => state.isLogin);
  const walletUsdcBalance = useGlobalStore((state) => state.walletUsdcBalance);
  const { notifyInsufficientUsdc } = useNotifyInsufficientUsdc();
  const [signOpen, setSignOpen] = useState(false);
  const [riskHelpOpen, setRiskHelpOpen] = useState(false);
  const [ipPowerOpen, setIpPowerOpen] = useState(false);

  const display = getActorPlazaCardDisplay(detail);
  const name = detail.name?.trim() || 'Laun';
  const description = detail.bio?.trim() || '';
  const imageUrl = resolveActorAvatarUrl(detail);
  const issuerName = detail.creatorName?.trim() || '-';
  const issuerUserId = readSnowflakeId(detail.userId);
  const actorIpValue = readSnowflakeId(detail.id) || '';
  const actorIpLabel = formatActorIpDisplay(actorIpValue);
  const ipPowerBreakdown = getActorIpPowerBreakdown(detail);
  const ipPower = detail.computingPower;
  const currentPrice = display.currentPriceUsdc;
  const remainingCount = display.availableMint;
  const isSoldOut = remainingCount <= 0;
  const isRiskActorIp = detail.trust !== undefined && detail.trust !== 1;
  const floorPriceLabel = formatActorFloorPriceDisplay(
    resolveActorFloorPriceUsdc(detail),
  );
  const isSignPriceInsufficient =
    !isSoldOut &&
    currentPrice > 0 &&
    (walletUsdcBalance === undefined ||
      !isGreaterThanOrEqual(walletUsdcBalance, currentPrice));

  const handleSignClick = () => {
    if (!isLogin) {
      login();
      return;
    }

    if (isSignPriceInsufficient) {
      notifyInsufficientUsdc(minus(currentPrice, walletUsdcBalance ?? 0));
      return;
    }

    setSignOpen(true);
  };

  const handleTradeClick = () => {
    toast.info(t('功能暂未开放'));
  };

  const handleRiskClick = () => {
    setRiskHelpOpen(true);
  };

  const handleIpPowerClick = () => {
    setIpPowerOpen(true);
  };

  const handleCopyActorIp = async () => {
    if (!actorIpValue) {
      return;
    }
    await navigator.clipboard.writeText(actorIpValue);
    toast.success(t('编号已复制'));
  };

  return (
    <>
      <section className="w-full bg-points-page-surface-muted pb-0 md:pt-3">
        <div className="mx-auto w-full max-w-[1920px] px-0 md:px-4">
          <div
            className={cn(
              'flex w-full flex-col overflow-hidden bg-card',
              'md:min-h-[380px] md:flex-row md:items-stretch md:gap-8 md:rounded-2xl md:pr-8',
            )}
          >
            <div
              className={cn(
                'aspect-square w-full overflow-hidden bg-muted',
                'md:aspect-3/4 md:h-auto md:w-[300px] md:shrink-0 md:rounded-xl',
              )}
            >
              {imageUrl ? (
                <img
                  alt=""
                  className="size-full object-cover"
                  decoding="async"
                  height={800}
                  loading="eager"
                  src={imageUrl}
                  width={600}
                />
              ) : (
                <div className="flex size-full items-center justify-center">
                  <IconAvatarDefault className="size-20 text-muted-foreground" />
                </div>
              )}
            </div>

            <div
              className={cn(
                'flex min-w-0 flex-1 flex-col justify-center gap-4 p-4',
                'md:gap-8 md:py-8 md:pr-0 md:pl-0',
              )}
            >
              <div className="flex min-w-0 flex-col gap-3 md:gap-4">
                <div className="flex min-w-0 flex-col gap-3">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <h1
                      className={cn(
                        'min-w-0 truncate text-2xl leading-[30px] font-bold tracking-[-0.1px] text-foreground',
                        'md:text-4xl md:leading-none md:tracking-[-0.12px]',
                      )}
                    >
                      {name}
                    </h1>
                    {isRiskActorIp ? (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={handleRiskClick}
                        className="h-auto shrink-0 gap-1 rounded-[49px] bg-game-risk-badge-surface px-1.5 py-1 text-xs leading-4 font-normal tracking-[0.04px] text-game-risk-badge-text shadow-none hover:bg-game-risk-badge-surface hover:text-game-risk-badge-text"
                      >
                        <AlertTriangleIcon className="size-4 shrink-0" />
                        {t('风险IP')}
                      </Button>
                    ) : null}
                  </div>
                  <div className="flex max-w-full flex-wrap items-center gap-1.5">
                    <ContentBadge badge={detail.badge} className="shrink-0" />
                    <ActorDetailBadge
                      className="max-w-full md:max-w-[640px]"
                      profileUserId={issuerUserId}
                    >
                      {t('发行者 {{name}}', { name: issuerName })}
                    </ActorDetailBadge>
                    <ActorDetailBadge onClick={() => void handleCopyActorIp()}>
                      {t('角色 IP {{code}}', { code: actorIpLabel })}
                    </ActorDetailBadge>
                    {isSoldOut ? (
                      <ActorDetailBadge className="bg-destructive/15 text-destructive">
                        {t('已售罄')}
                      </ActorDetailBadge>
                    ) : null}
                  </div>
                </div>

                <p className="line-clamp-4 text-sm leading-5 tracking-[0.04px] text-foreground md:max-w-[640px]">
                  {description}
                </p>
              </div>

              <div
                className={cn(
                  // Figma Page&Sheet/secondary：浅 #f0f0f3 / 深 #212225
                  'flex w-full items-center justify-center rounded-xl bg-muted p-4',
                  'md:w-[300px] md:px-8 md:py-6',
                )}
              >
                <ActorDetailPayMetric
                  label={t('片酬')}
                  value={formatPowerFactor(ipPower)}
                  onClick={handleIpPowerClick}
                />
              </div>

              <div
                className={cn(
                  'fixed inset-x-0 bottom-0 z-40 flex w-full flex-col gap-2 bg-background/95 px-4 pt-1 pb-[calc(env(safe-area-inset-bottom)+30px)] backdrop-blur-md',
                  'md:static md:z-auto md:w-full md:bg-transparent md:p-0 md:backdrop-blur-none',
                )}
              >
                {isSoldOut ? (
                  <>
                    <div className="hidden flex-wrap items-center gap-4 md:flex">
                      <div className="flex h-11 items-center gap-2 rounded-[40px] border border-onestory-brand-red/20 bg-onestory-brand-red/5 px-4 py-2.5">
                        <span className="text-sm leading-5 font-bold tracking-[0.04px] text-foreground">
                          {t('地板价')}
                        </span>
                        <span className="text-sm leading-5 font-bold tracking-[0.04px] text-onestory-brand-red">
                          {floorPriceLabel}
                        </span>
                      </div>
                      <Button
                        type="button"
                        onClick={handleTradeClick}
                        className="h-11 rounded-[40px] bg-foreground px-10 text-sm leading-5 font-bold tracking-[0.03px] text-background hover:bg-foreground/90 md:px-16"
                      >
                        {t('去交易')}
                      </Button>
                    </div>
                    <Button
                      type="button"
                      onClick={handleTradeClick}
                      className="h-11 w-full rounded-xl bg-foreground px-10 text-sm leading-5 font-bold tracking-[0.03px] text-background hover:bg-foreground/90 md:hidden"
                    >
                      <span className="truncate">
                        {`${floorPriceLabel} · ${t('去交易')}`}
                      </span>
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    onClick={handleSignClick}
                    variant="default"
                    className={cn(
                      'h-11 w-full rounded-xl bg-foreground px-10 text-sm leading-5 font-bold tracking-[0.03px] text-background hover:bg-foreground/90',
                      'md:w-fit md:px-16',
                    )}
                  >
                    {`${formatActorPriceCeilDisplay(currentPrice)} USDC · ${t('签约')}`}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <ActorMintDialogs
        actor={detail}
        availableMint={remainingCount}
        active={signOpen}
        onInactive={() => setSignOpen(false)}
        refreshTarget="detail"
      />
      <ActorRiskIpDialog open={riskHelpOpen} onOpenChange={setRiskHelpOpen} />
      <ActorIpPowerDialog
        open={ipPowerOpen}
        onOpenChange={setIpPowerOpen}
        actorName={name}
        breakdown={ipPowerBreakdown}
      />
    </>
  );
}
