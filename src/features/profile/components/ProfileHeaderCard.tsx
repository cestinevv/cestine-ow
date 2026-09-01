import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { FollowStatsResponse } from '@/api/__generated__/wallet/model/followStatsResponse';
import IconAlertTriangle from '@/assets/svg/IconAlertTriangle';
import IconChevronDown from '@/assets/svg/IconChevronDown';
import IconCommentMore from '@/assets/svg/IconCommentMore';
import IconPencil from '@/assets/svg/IconPencil';
import { TokenAssetIcon } from '@/components/common/TokenAssetIcon';
import { UserProfileAvatarCircle } from '@/components/common/UserProfileAvatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';
import { PLATO_TRADE_URL } from '@/constants';
import type { ProfileFollowRelationTab } from '@/features/profile/profileFollowRelations';
import { shouldShowProfileHeaderAction } from '@/features/profile/profileHeaderActions';
import { useAppPrivyAccount } from '@/hooks/useAppPrivyAccount';
import { useConfigStore } from '@/stores/config';
import { useDialogStore } from '@/stores/dialogStore';
import useGlobalStore from '@/stores/global';
import { cn, formatNumber, SHOW_DEV_ONLY_UI } from '@/utils';
import { ProfileBlockIcon, ProfileUnblockIcon } from './ProfileModerationIcons';

type ProfileHeaderCardProps = {
  displayName: string;
  /** 个人简介；空则不展示 */
  profile?: string;
  userId?: string;
  avatarUrl?: string;
  avatarFallbackChar?: string;
  isOwn: boolean;
  isLogin?: boolean;
  followStats?: FollowStatsResponse;
  followActionLabelKey?: string;
  isFollowActionPending?: boolean;
  showMoreActions?: boolean;
  blockActionLabelKey?: string;
  onEditClick?: () => void;
  onFollowRelationClick?: (tab: ProfileFollowRelationTab) => void;
  onFollowActionClick?: () => void;
  onReportClick?: () => void;
  onBlockActionClick?: () => void;
};

type ProfileAssetSymbol = 'USDC' | 'STORY';
type ProfileRelationStat = {
  tab: ProfileFollowRelationTab | 'likes';
  count?: string;
  labelKey: string;
};

function ProfileAssetActionSheet({
  asset,
  onOpenChange,
  onAction,
}: {
  asset?: ProfileAssetSymbol;
  onOpenChange: (open: boolean) => void;
  onAction: (action: 'trade' | 'deposit' | 'withdraw') => void;
}) {
  const { t } = useTranslation();
  const actions =
    asset === 'STORY'
      ? [
          { value: 'trade' as const, labelKey: '交易' },
          { value: 'deposit' as const, labelKey: '充值' },
          { value: 'withdraw' as const, labelKey: '提现' },
        ]
      : [
          { value: 'deposit' as const, labelKey: '充值' },
          { value: 'withdraw' as const, labelKey: '提现' },
        ];

  return (
    <Sheet open={asset !== undefined} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        overlayClassName="bg-black/45"
        className="gap-4 rounded-t-2xl border-t-0 bg-[#111113] px-4 pt-0 pb-[calc(env(safe-area-inset-bottom)+44px)] text-[#edeef0] shadow-none outline-none md:hidden"
      >
        <div className="flex w-full flex-col items-center gap-3">
          <div className="flex w-full items-center justify-center p-2.5">
            <div className="h-1 w-12 rounded-full bg-[#50535a]" />
          </div>
          <SheetTitle className="w-full text-center text-lg leading-[26px] font-bold tracking-[-0.04px] text-[#edeef0]">
            {asset}
          </SheetTitle>
        </div>

        <div className="flex w-full flex-col gap-3">
          <div className="flex w-full flex-col overflow-hidden rounded-xl bg-[#212225]">
            {actions.map((item, index) => (
              <Button
                key={item.value}
                type="button"
                variant="ghost"
                onClick={() => onAction(item.value)}
                className={cn(
                  'h-14 w-full rounded-none bg-[#212225] text-base leading-6 font-medium text-[#edeef0]',
                  'hover:bg-[#2b2d31] hover:text-[#edeef0]',
                  index > 0 && 'border-t border-[#363a3f]',
                )}
              >
                {t(item.labelKey)}
              </Button>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-11 w-full rounded-xl border-[1.5px] border-[#363a3f] bg-transparent text-sm leading-5 font-bold text-[#edeef0] hover:bg-[#212225] hover:text-[#edeef0]"
          >
            {t('取消')}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ProfileWalletAssetRow({
  symbol,
  label,
  amount,
  iconUrl,
  primaryActionLabelKey,
  onPrimaryAction,
  onOpenActions,
}: {
  symbol: ProfileAssetSymbol;
  label: string;
  amount?: string;
  iconUrl?: string;
  primaryActionLabelKey: string;
  onPrimaryAction: (asset: ProfileAssetSymbol) => void;
  onOpenActions: (asset: ProfileAssetSymbol) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex w-full items-center gap-2">
      {/* 空白区域：打开操作弹层 */}
      <Button
        type="button"
        variant="ghost"
        onClick={() => onOpenActions(symbol)}
        className={cn(
          'h-auto min-w-0 flex-1 justify-start gap-2 rounded-xl p-0',
          'text-left hover:bg-transparent',
        )}
      >
        <TokenAssetIcon symbol={symbol} iconUrl={iconUrl} className="size-9" />
        <span className="flex min-w-0 flex-1 flex-col items-start">
          <span className="text-[13px] leading-[18px] font-normal text-wallet-text-secondary">
            {label}
          </span>
          <span className="text-lg leading-[26px] font-bold tracking-[-0.04px] text-foreground">
            {formatNumber(amount, 2)}
          </span>
        </span>
      </Button>

      {/* 主操作：USDC 充值 / Story 交易 — 直接跳转，不弹层 */}
      <Button
        type="button"
        variant="ghost"
        onClick={() => onPrimaryAction(symbol)}
        className={cn(
          'h-auto shrink-0 rounded-md bg-background px-[19px] py-1.5',
          'text-xs leading-4 font-medium tracking-[0.04px] text-foreground',
          'hover:bg-background hover:text-foreground',
        )}
      >
        {t(primaryActionLabelKey)}
      </Button>

      {/* 更多：打开操作弹层 */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={t('更多')}
        onClick={() => onOpenActions(symbol)}
        className={cn(
          'size-7 shrink-0 rounded-md bg-background p-0',
          'hover:bg-background hover:text-foreground',
        )}
      >
        <IconCommentMore className="size-5 rotate-90 text-foreground" />
      </Button>
    </div>
  );
}

function ProfileMobileWalletPanel() {
  const [activeAsset, setActiveAsset] = useState<ProfileAssetSymbol>();
  const walletUsdcBalance = useGlobalStore((state) => state.walletUsdcBalance);
  const walletStoryBalance = useGlobalStore(
    (state) => state.walletStoryBalance,
  );
  const usdcToken = useConfigStore((state) => state.usdcToken);
  const storyToken = useConfigStore((state) => state.storyToken);
  const openDepositDialog = useDialogStore((state) => state.openDepositDialog);
  const openWithdrawDialog = useDialogStore(
    (state) => state.openWithdrawDialog,
  );

  // 行内主按钮：USDC→站内充值；STORY→Plato 交易页
  function handlePrimaryAction(asset: ProfileAssetSymbol) {
    if (asset === 'STORY') {
      window.open(PLATO_TRADE_URL, '_blank', 'noopener,noreferrer');
      return;
    }

    openDepositDialog();
  }

  function handleAssetAction(action: 'trade' | 'deposit' | 'withdraw') {
    setActiveAsset(undefined);
    if (action === 'trade') {
      window.open(PLATO_TRADE_URL, '_blank', 'noopener,noreferrer');
      return;
    }

    if (action === 'deposit') {
      openDepositDialog();
      return;
    }

    openWithdrawDialog();
  }

  return (
    <>
      <div className="flex w-full flex-col rounded-xl bg-wallet-surface-muted p-4 md:hidden">
        <ProfileWalletAssetRow
          symbol="USDC"
          label="USDC"
          amount={walletUsdcBalance}
          iconUrl={usdcToken?.icon}
          primaryActionLabelKey="充值"
          onPrimaryAction={handlePrimaryAction}
          onOpenActions={setActiveAsset}
        />
        {SHOW_DEV_ONLY_UI ? (
          <>
            <div className="my-3 h-px w-full bg-wallet-divider" />
            <ProfileWalletAssetRow
              symbol="STORY"
              label="Story"
              amount={walletStoryBalance}
              iconUrl={storyToken?.icon}
              primaryActionLabelKey="交易"
              onPrimaryAction={handlePrimaryAction}
              onOpenActions={setActiveAsset}
            />
          </>
        ) : null}
      </div>
      <ProfileAssetActionSheet
        asset={activeAsset}
        onOpenChange={(open) => !open && setActiveAsset(undefined)}
        onAction={handleAssetAction}
      />
    </>
  );
}

export function ProfileHeaderCard({
  displayName,
  profile,
  userId,
  avatarUrl,
  avatarFallbackChar,
  isOwn,
  isLogin = true,
  followStats,
  followActionLabelKey,
  isFollowActionPending,
  showMoreActions,
  blockActionLabelKey,
  onEditClick,
  onFollowRelationClick,
  onFollowActionClick,
  onReportClick,
  onBlockActionClick,
}: ProfileHeaderCardProps) {
  const { t } = useTranslation();
  const { loginType } = useAppPrivyAccount();
  const [profileExpanded, setProfileExpanded] = useState(false);
  const [isProfileCollapsible, setIsProfileCollapsible] = useState(false);
  const profileTextRef = useRef<HTMLSpanElement>(null);

  const profileTrimmed = profile?.trim();
  const relationStatsAll: ProfileRelationStat[] = [
    {
      tab: 'following',
      count: followStats?.followingCount,
      labelKey: '关注',
    },
    {
      tab: 'followers',
      count: followStats?.followerCount,
      labelKey: '粉丝',
    },
    {
      tab: 'mutuals',
      count: followStats?.mutualCount,
      labelKey: '互关',
    },
  ];
  const relationStats = isOwn
    ? [
        ...relationStatsAll,
        { tab: 'likes', count: undefined, labelKey: '获赞' },
      ]
    : [
        ...relationStatsAll.filter((item) => item.tab !== 'mutuals'),
        { tab: 'likes', count: undefined, labelKey: '获赞' },
      ];
  const relationStatsClickable = isOwn && onFollowRelationClick !== undefined;
  const isPrimaryFollowAction = followActionLabelKey === '关注';
  const showHeaderAction = shouldShowProfileHeaderAction({
    isLogin,
    isOwn,
    hasFollowAction: Boolean(followActionLabelKey),
  });
  const isBlockedAction = blockActionLabelKey === '解除拉黑';
  const moreMenuWidthClassName = isBlockedAction
    ? 'w-[124px] min-w-[124px]'
    : 'w-24 min-w-24';

  // biome-ignore lint/correctness/useExhaustiveDependencies: 简介内容变化时需重置展开态
  useEffect(() => {
    setProfileExpanded(false);
  }, [profileTrimmed]);

  useEffect(() => {
    const profileTextElement = profileTextRef.current;
    if (!profileTextElement || !profileTrimmed) {
      setIsProfileCollapsible(false);
      return;
    }

    function updateProfileOverflow(element: HTMLSpanElement) {
      const lineHeight =
        Number.parseFloat(window.getComputedStyle(element).lineHeight) || 20;
      setIsProfileCollapsible(element.scrollHeight > lineHeight * 2 + 1);
    }

    updateProfileOverflow(profileTextElement);
    const resizeObserver =
      typeof ResizeObserver === 'undefined'
        ? undefined
        : new ResizeObserver(() => updateProfileOverflow(profileTextElement));
    resizeObserver?.observe(profileTextElement);
    const handleResize = () => updateProfileOverflow(profileTextElement);
    window.addEventListener('resize', handleResize);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [profileTrimmed]);

  return (
    <section
      className={cn(
        // Layout — desktop Figma 6284:69877；mobile 4243:14926
        'flex w-full flex-col',
        // Spacing
        'gap-5 p-0 md:gap-0 md:p-10',
        // Visual — mobile: 12px 圆角 + 描边；桌面：16px 圆角 + 描边
        'rounded-none border-0 bg-transparent',
        'md:rounded-2xl md:border md:border-language-switcher-border md:bg-card',
        'md:rounded-2xl md:border-language-switcher-border',
        'md:flex-row md:items-center md:gap-8 md:min-w-0',
      )}
    >
      <div className="flex w-full flex-col items-center gap-4 md:contents">
        <div
          className={cn(
            // Layout
            'flex w-full min-w-0 flex-1 flex-col items-center gap-3',
            'md:min-w-0 md:flex-1 md:flex-row md:items-center md:gap-8',
          )}
        >
          <div className="relative shrink-0">
            <UserProfileAvatarCircle
              userId={userId}
              avatarUrl={avatarUrl}
              size={128}
              alt={displayName}
              fallbackChar={avatarFallbackChar}
              containerClassName="size-[88px] shrink-0 md:size-32"
              ringClassName="ring-4 ring-language-switcher-active/35"
            />
            {isOwn ? (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={onEditClick}
                className="absolute right-0 bottom-0 size-6 rounded-full border border-background bg-foreground p-0 text-background hover:bg-foreground/90 hover:text-background md:hidden"
                aria-label={t('编辑')}
              >
                <IconPencil className="size-4" />
              </Button>
            ) : null}
          </div>

          <div className="flex w-full min-w-0 flex-1 flex-col items-center gap-2 md:w-auto md:min-w-0 md:items-start">
            <h1
              title={displayName}
              className={cn(
                // Typography — mobile 18/26；桌面 24/30（Figma 6284:69877）
                'min-w-0 wrap-break-word text-center md:text-left',
                'text-[17px] leading-[25px] font-bold text-foreground',
                'md:text-2xl md:leading-[30px] md:tracking-[-0.1px]',
              )}
            >
              {displayName}
            </h1>

            {profileTrimmed ? (
              <div className="order-2 flex w-full flex-col items-center md:order-none md:items-start">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    if (isProfileCollapsible) {
                      setProfileExpanded((expanded) => !expanded);
                    }
                  }}
                  className={cn(
                    'h-auto w-full items-end justify-center gap-1 rounded-none px-0 py-0 text-center whitespace-normal text-foreground hover:bg-transparent hover:text-foreground md:hidden',
                    !isProfileCollapsible && 'cursor-default',
                  )}
                >
                  <span
                    ref={profileTextRef}
                    className={cn(
                      'min-w-0 wrap-break-word whitespace-normal text-sm leading-5 font-normal text-foreground',
                      !profileExpanded && 'line-clamp-2',
                    )}
                  >
                    {profileTrimmed}
                  </span>
                  {isProfileCollapsible && !profileExpanded ? (
                    <IconChevronDown className="mb-0.5 size-4 shrink-0 text-foreground" />
                  ) : null}
                </Button>
                <p className="hidden w-full wrap-break-word text-sm leading-[21px] text-wallet-text-secondary md:block md:text-left">
                  {profileTrimmed}
                </p>
              </div>
            ) : null}

            <div
              className={cn(
                'order-1 grid w-full items-center gap-0 px-3 pt-1',
                isOwn
                  ? 'grid-cols-[repeat(4,minmax(0,1fr))]'
                  : 'grid-cols-[repeat(3,minmax(0,1fr))]',
                'md:order-none md:flex md:w-auto md:flex-wrap md:justify-start md:gap-4 md:px-0',
              )}
            >
              {relationStats.map((item, index) =>
                relationStatsClickable && item.tab !== 'likes' ? (
                  <Button
                    key={item.tab}
                    type="button"
                    variant="ghost"
                    onClick={() =>
                      onFollowRelationClick?.(
                        item.tab as ProfileFollowRelationTab,
                      )
                    }
                    className={cn(
                      'relative h-auto min-w-0 w-full flex-col items-center gap-0 rounded-lg p-0 md:w-auto md:flex-none',
                      'text-left hover:bg-transparent hover:text-foreground',
                      'md:items-center',
                      index > 0 &&
                        'before:absolute before:left-0 before:top-1/2 before:h-[13px] before:w-px before:-translate-y-1/2 before:bg-wallet-divider md:before:hidden',
                    )}
                  >
                    <span className="text-base leading-6 font-bold text-foreground md:text-sm md:leading-5">
                      {item.count ?? '-'}
                    </span>
                    <span className="text-xs leading-4 font-normal text-wallet-text-secondary">
                      {t(item.labelKey)}
                    </span>
                  </Button>
                ) : (
                  <div
                    key={item.tab}
                    className={cn(
                      'relative flex min-w-0 w-full flex-col items-center gap-0 text-center md:w-auto md:flex-none',
                      item.tab === 'likes' && 'md:hidden',
                      index > 0 &&
                        'before:absolute before:left-0 before:top-1/2 before:h-[13px] before:w-px before:-translate-y-1/2 before:bg-wallet-divider md:before:hidden',
                    )}
                  >
                    <span className="text-base leading-6 font-bold text-foreground md:text-sm md:leading-5">
                      {item.count ?? '-'}
                    </span>
                    <span className="text-xs leading-4 font-normal text-wallet-text-secondary">
                      {t(item.labelKey)}
                    </span>
                  </div>
                ),
              )}
            </div>
          </div>
        </div>

        <div className="hidden shrink-0 items-center gap-2 self-start md:flex md:self-center">
          {showHeaderAction && isOwn ? (
            <Button
              type="button"
              variant="outline"
              onClick={onEditClick}
              className={cn(
                // Layout — mobile pill；桌面 rounded-8（Figma 6284:69877）
                'h-11 rounded-full px-6 py-3',
                'md:h-11 md:rounded-lg md:px-6 md:py-2.5',
                // Visual
                'border-wallet-divider text-sm leading-5 font-normal text-foreground',
              )}
            >
              {t('编辑')}
            </Button>
          ) : showHeaderAction && followActionLabelKey ? (
            <Button
              type="button"
              disabled={isFollowActionPending}
              onClick={onFollowActionClick}
              className={cn(
                'h-11 rounded-full px-6 py-3',
                'md:h-11 md:rounded-xl md:px-6 md:py-2.5',
                'text-sm leading-5 font-bold',
                isPrimaryFollowAction
                  ? 'border-transparent bg-foreground text-background hover:bg-foreground/90'
                  : 'border border-wallet-divider bg-background text-foreground hover:bg-muted',
              )}
            >
              {isFollowActionPending ? (
                <Spinner className="mr-1 size-4" />
              ) : null}
              {t(followActionLabelKey)}
            </Button>
          ) : null}

          {showMoreActions ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  'inline-flex size-11 items-center justify-center rounded-full',
                  'border border-wallet-divider bg-background text-foreground outline-none',
                  'md:rounded-xl md:border-[1.5px]',
                  'hover:bg-muted',
                )}
                aria-label={t('更多')}
              >
                <IconCommentMore className="size-5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                sideOffset={8}
                className={cn(
                  'flex flex-col overflow-hidden rounded-2xl border-0 bg-card p-0',
                  'shadow-[1px_5px_20px_rgba(0,0,0,0.13)]',
                  moreMenuWidthClassName,
                )}
              >
                {blockActionLabelKey ? (
                  <DropdownMenuItem
                    onClick={onBlockActionClick}
                    className={cn(
                      'flex h-14 w-full cursor-pointer items-center justify-start gap-3 rounded-none p-4',
                      'text-sm leading-5 font-normal text-wallet-text-secondary',
                      'focus:bg-muted focus:text-wallet-text-secondary',
                    )}
                  >
                    {isBlockedAction ? (
                      <ProfileUnblockIcon className="size-6 text-wallet-text-secondary" />
                    ) : (
                      <ProfileBlockIcon className="size-6 text-foreground" />
                    )}
                    <span className="whitespace-nowrap">
                      {t(blockActionLabelKey)}
                    </span>
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem
                  onClick={onReportClick}
                  className={cn(
                    'flex h-14 w-full cursor-pointer items-center justify-start gap-3 rounded-none p-4',
                    'text-sm leading-5 font-normal text-wallet-text-secondary',
                    'focus:bg-muted focus:text-wallet-text-secondary',
                  )}
                >
                  <IconAlertTriangle className="size-6 text-wallet-text-secondary" />
                  <span className="whitespace-nowrap">{t('举报')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </div>
      {!isOwn && (showHeaderAction || showMoreActions) ? (
        <div className="flex w-full items-center gap-2 md:hidden">
          {showHeaderAction && followActionLabelKey ? (
            <Button
              type="button"
              disabled={isFollowActionPending}
              onClick={onFollowActionClick}
              className={cn(
                'h-11 min-w-0 flex-1 rounded-xl px-3 py-2.5 text-[15px] leading-[22px] font-medium',
                isPrimaryFollowAction
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'border border-wallet-divider bg-background text-foreground hover:bg-muted',
              )}
            >
              {isFollowActionPending ? (
                <Spinner className="mr-1 size-4" />
              ) : null}
              {t(followActionLabelKey)}
            </Button>
          ) : null}

          {showMoreActions ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  'inline-flex size-11 shrink-0 items-center justify-center rounded-xl',
                  'border border-wallet-divider bg-background text-foreground outline-none',
                  'hover:bg-muted',
                )}
                aria-label={t('更多')}
              >
                <IconCommentMore className="size-5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                sideOffset={8}
                className={cn(
                  'flex flex-col overflow-hidden rounded-2xl border-0 bg-card p-0',
                  'shadow-[1px_5px_20px_rgba(0,0,0,0.13)]',
                  moreMenuWidthClassName,
                )}
              >
                {blockActionLabelKey ? (
                  <DropdownMenuItem
                    onClick={onBlockActionClick}
                    className={cn(
                      'flex h-14 w-full cursor-pointer items-center justify-start gap-3 rounded-none p-4',
                      'text-sm leading-5 font-normal text-wallet-text-secondary',
                      'focus:bg-muted focus:text-wallet-text-secondary',
                    )}
                  >
                    {isBlockedAction ? (
                      <ProfileUnblockIcon className="size-6 text-wallet-text-secondary" />
                    ) : (
                      <ProfileBlockIcon className="size-6 text-foreground" />
                    )}
                    <span className="whitespace-nowrap">
                      {t(blockActionLabelKey)}
                    </span>
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem
                  onClick={onReportClick}
                  className={cn(
                    'flex h-14 w-full cursor-pointer items-center justify-start gap-3 rounded-none p-4',
                    'text-sm leading-5 font-normal text-wallet-text-secondary',
                    'focus:bg-muted focus:text-wallet-text-secondary',
                  )}
                >
                  <IconAlertTriangle className="size-6 text-wallet-text-secondary" />
                  <span className="whitespace-nowrap">{t('举报')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      ) : null}
      {isOwn && loginType === 'email' ? <ProfileMobileWalletPanel /> : null}
    </section>
  );
}
