import { type MouseEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import type { ActorCollectionResponse } from '@/api/__generated__/story/model/actorCollectionResponse';
import IconActorIpBadge from '@/assets/svg/IconActorIpBadge';
import { ActorDetailRouteLink } from '@/components/common/ActorDetailRouteLink';
import { Button } from '@/components/ui/button';
import {
  formatActorFloorPriceDisplay,
  formatActorIpDisplay,
  getActorPlazaCardDisplay,
  resolveActorAvatarUrl,
  resolveActorFloorPriceUsdc,
} from '@/features/actor/actorFormat';
import { ActorLv1RateDialog } from '@/features/actor/components/ActorLv1RateDialog';
import { ActorMintDialogs } from '@/features/actor/components/ActorMintDialogs';
import { ActorPlazaCardBody } from '@/features/actor/components/ActorPlazaCardBody';
import { ACTOR_PLAZA_CARD_COVER_ASPECT_CLASS } from '@/features/actor/constants/actorPlazaCardGrid';
import {
  buildPlazaActorMiningBreakdown,
  getPlazaActorHourlyRates,
} from '@/features/actor/plazaActorStoryRate';
import { useAppLogin } from '@/hooks/useAppLogin';
import { useNotifyInsufficientUsdc } from '@/hooks/useNotifyInsufficientUsdc';
import { useConfigStore } from '@/stores/config';
import useGlobalStore from '@/stores/global';
import { cn, isGreaterThanOrEqual, minus } from '@/utils';
import { readSnowflakeId } from '@/utils/snowflakeId';

type ActorPlazaCardProps = {
  item: ActorCollectionResponse;
  presentation?: 'plaza' | 'search';
  onMintSuccess?: () => Promise<unknown> | unknown;
};

export function ActorPlazaCard({
  item,
  presentation = 'plaza',
  onMintSuccess,
}: ActorPlazaCardProps) {
  const { t } = useTranslation();
  const { login } = useAppLogin();
  const initConfig = useConfigStore((state) => state.initConfig);
  const isLogin = useGlobalStore((state) => state.isLogin);
  const walletUsdcBalance = useGlobalStore((state) => state.walletUsdcBalance);
  const { notifyInsufficientUsdc } = useNotifyInsufficientUsdc();
  const [signOpen, setSignOpen] = useState(false);
  const [lv1RateDialogOpen, setLv1RateDialogOpen] = useState(false);

  const actorId = readSnowflakeId(item.id);
  const name = item.name?.trim() || '-';
  const bio = item.bio?.trim() || '';
  const imageUrl = resolveActorAvatarUrl(item);
  const display = getActorPlazaCardDisplay(item);
  const creatorName = item.creatorName?.trim();
  const creatorUserId = readSnowflakeId(item.userId);
  const rates = getPlazaActorHourlyRates(item, initConfig ?? undefined);
  const currentPrice = display.currentPriceUsdc;
  const remainingCount = display.availableMint;
  const isSoldOut = remainingCount <= 0;
  const floorPriceLabel = formatActorFloorPriceDisplay(
    resolveActorFloorPriceUsdc(item),
  );
  const isSignPriceInsufficient =
    !isSoldOut &&
    currentPrice > 0 &&
    (walletUsdcBalance === undefined ||
      !isGreaterThanOrEqual(walletUsdcBalance, currentPrice));
  const actorIpValue = actorId || '';
  const actorIpLabel = formatActorIpDisplay(actorIpValue);
  const lv1Breakdown = buildPlazaActorMiningBreakdown(item, {
    miningCoefficient: rates.lv1MiningCoefficient,
    actorPower: rates.lv1Rate,
  });

  if (!item.name?.trim() && item.id === undefined) {
    return null;
  }

  // 打开 Lv.1 片酬详情
  const handleLv1RateClick = () => {
    setLv1RateDialogOpen(true);
  };

  // 未登录先登录；余额不足拦截；否则打开签约弹窗
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

  // 售罄后的二级市场入口尚未开放
  const handleTradeClick = () => {
    toast.info(t('功能暂未开放'));
  };

  const copyActorIp = async () => {
    if (!actorIpValue) {
      return;
    }
    await navigator.clipboard.writeText(actorIpValue);
    toast.success(t('复制成功'));
  };

  // 复制角色 IP，避免触发封面跳转
  const handleCopyActorIp = (event: MouseEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    void copyActorIp();
  };

  // 关闭签约弹窗
  const handleMintInactive = () => {
    setSignOpen(false);
  };

  return (
    <>
      <article
        className={cn(
          'flex w-full flex-col overflow-hidden rounded-[10px] bg-card index-shadow-pipeline-hover',
        )}
      >
        <div
          className={cn(
            'relative w-full overflow-hidden',
            ACTOR_PLAZA_CARD_COVER_ASPECT_CLASS,
          )}
        >
          {actorId ? (
            <ActorDetailRouteLink
              actorId={actorId}
              className="block size-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {imageUrl ? (
                <img
                  alt=""
                  className="block size-full object-cover"
                  decoding="async"
                  height={500}
                  loading="lazy"
                  src={imageUrl}
                  width={600}
                />
              ) : (
                <div className="size-full bg-muted" aria-hidden />
              )}
            </ActorDetailRouteLink>
          ) : imageUrl ? (
            <img
              alt=""
              className="block size-full object-cover"
              decoding="async"
              height={500}
              loading="lazy"
              src={imageUrl}
              width={600}
            />
          ) : (
            <div className="size-full bg-muted" aria-hidden />
          )}
          <div className="pointer-events-none absolute bottom-3 left-3 flex items-center">
            <Button
              type="button"
              variant="ghost"
              onClick={handleCopyActorIp}
              className={cn(
                'pointer-events-auto h-auto min-w-0 gap-0.5 rounded-full border-transparent',
                'bg-black/50 py-1 pr-1.5 pl-1 text-xs leading-4 font-medium tracking-[0.04px] text-white',
                'hover:bg-black/60 hover:text-white',
              )}
            >
              <IconActorIpBadge className="size-4 shrink-0 text-white" />
              <span className="truncate">{actorIpLabel}</span>
            </Button>
          </div>
        </div>

        <ActorPlazaCardBody
          presentation={presentation}
          name={name}
          bio={bio}
          lv1Rate={rates.lv1Rate}
          currentPrice={currentPrice}
          floorPriceLabel={floorPriceLabel}
          isSoldOut={isSoldOut}
          remainingCount={remainingCount}
          creatorName={
            creatorName && creatorName !== '-' ? creatorName : undefined
          }
          creatorUserId={creatorUserId}
          onLv1RateClick={handleLv1RateClick}
          onSignClick={handleSignClick}
          onTradeClick={handleTradeClick}
        />
      </article>

      <ActorLv1RateDialog
        open={lv1RateDialogOpen}
        onOpenChange={setLv1RateDialogOpen}
        actorName={name}
        breakdown={lv1Breakdown}
      />
      <ActorMintDialogs
        actor={item}
        availableMint={remainingCount}
        active={signOpen}
        onInactive={handleMintInactive}
        refreshTarget="plaza"
        onMintSuccess={onMintSuccess}
      />
    </>
  );
}
