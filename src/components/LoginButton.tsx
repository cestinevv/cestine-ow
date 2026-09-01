import { usePrivy } from '@privy-io/react-auth';
import { useNavigate } from '@tanstack/react-router';
import {
  type MouseEvent,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { IconAvatarDefault } from '@/assets/svg/IconAvatarDefault';
import IconCopy from '@/assets/svg/IconCopy';
import IconCreatorsReasonToken from '@/assets/svg/IconCreatorsReasonToken';
import IconHistory from '@/assets/svg/IconHistory';
import IconLogout from '@/assets/svg/IconLogout';
import IconMoreArrow from '@/assets/svg/IconMoreArrow';
import IconReferralEarnInvite from '@/assets/svg/IconReferralEarnInvite';
import IconSiteNavSettings from '@/assets/svg/IconSiteNavSettings';
import IconSolana from '@/assets/svg/IconSolana';
import { TokenAssetIcon } from '@/components/common/TokenAssetIcon';
import { UserProfileAvatarCircle } from '@/components/common/UserProfileAvatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';
import { PLATO_TRADE_URL } from '@/constants';
import {
  buildExplorerAccountUrl,
  getChainExplorer,
} from '@/hooks/solana/chainRpcConfig';
import { useAppLogin } from '@/hooks/useAppLogin';
import { useAppPrivyAccount } from '@/hooks/useAppPrivyAccount';
import { usePrivyDepositAddresses } from '@/hooks/usePrivyDepositAddresses';
import { MobileSettingsFlow } from '@/layouts/components/MobileSettingsFlow';
import {
  clearMobileSettingsDrawerRestore,
  readMobileSettingsDrawerRestore,
} from '@/layouts/components/mobileSettingsDrawerRestore';
import { SITE_HEADER_PRIMARY_PILL_BUTTON_CLASS } from '@/layouts/components/siteHeaderPrimaryPillButton';
import { notifyLockedNavIfDisabled } from '@/routing/tempNavGate';
import { getCurrentChain } from '@/solana/chainConfig';
import { hydrateAuthFlowStoreFromStorage } from '@/stores/authFlowStore';
import { useConfigStore } from '@/stores/config';
import { useDialogStore } from '@/stores/dialogStore';
import useGlobalStore, { getIsLoginFromStorage } from '@/stores/global';
import { cn, formatAddress, formatNumber, SHOW_DEV_ONLY_UI } from '@/utils';

const AUTH_LOADING_BUTTON_CLASSNAME = cn(
  SITE_HEADER_PRIMARY_PILL_BUTTON_CLASS,
  'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap',

  // loading 保留实心 pill，勿被 default 禁用填充覆盖
  'disabled:pointer-events-none disabled:opacity-100 disabled:bg-foreground disabled:text-background',
  'disabled:hover:bg-foreground',
);

const WALLET_NAV_ITEM_CLASS = cn(
  'relative flex w-full cursor-pointer items-start gap-2',
  'px-4 py-2',
  'rounded-none text-foreground',
  // 覆盖 DropdownMenuItem 默认 accent，深色下用 wallet 语义面
  'focus:bg-wallet-surface-muted focus:text-foreground',
  'data-highlighted:bg-wallet-surface-muted data-highlighted:text-foreground',
  'not-data-[variant=destructive]:focus:**:text-foreground',
);

const WALLET_NAV_ITEM_LOGOUT_CLASS = cn(WALLET_NAV_ITEM_CLASS, 'items-center');

const WALLET_NAV_ICON_CLASS = 'size-5 shrink-0 text-foreground';

const WALLET_NAV_LABEL_CLASS =
  'min-w-0 flex-1 text-left text-sm font-medium leading-5 text-foreground';

const WALLET_NAV_ARROW_CLASS = 'h-5 w-2.5 shrink-0 text-wallet-text-tertiary';

type AccountMenuPresentation = 'dropdown' | 'sheet';

type AccountActionItemProps = {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  presentation: AccountMenuPresentation;
  onClick?: () => void;
};

function AccountActionItem({
  children,
  className,
  disabled,
  presentation,
  onClick,
}: AccountActionItemProps) {
  if (presentation === 'dropdown') {
    return (
      <DropdownMenuItem
        disabled={disabled}
        className={cn(
          WALLET_NAV_ITEM_CLASS,
          className,
          disabled && 'data-disabled:opacity-100',
        )}
        onClick={onClick}
      >
        {children}
      </DropdownMenuItem>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      disabled={disabled}
      className={cn(
        WALLET_NAV_ITEM_CLASS,
        'h-auto justify-start disabled:text-foreground',
        className,
      )}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

function IconCreationManagement({ className }: { className?: string }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <title>Creation management</title>
      <path
        d="M8.33203 12.9866C6.86044 12.3437 5.83203 10.8753 5.83203 9.16667C5.83203 6.86548 7.69751 5 9.9987 5C12.2999 5 14.1654 6.86548 14.1654 9.16667C14.1654 10.8753 13.137 12.3437 11.6654 12.9866L11.6654 16.25L8.33203 15.4167"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11.6654 18.3333L8.33203 17.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M10 1.6665V2.49984"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
      <path
        d="M15.3047 3.86328L14.7154 4.45254"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
      <path
        d="M17.5 9.1665H16.6667"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
      <path
        d="M2.5 9.1665H3.33333"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
      <path
        d="M4.69922 3.86279L5.28847 4.45205"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  );
}

type LoginButtonProps = {
  /** siteTop：V2 顶栏次级面 pill（余额在左、头像在右）；default：foreground 实心 pill */
  appearance?: 'avatarOnly' | 'default' | 'siteTop';
  menuPresentation?: AccountMenuPresentation;
};

export function LoginButton({
  appearance = 'default',
  menuPresentation = 'dropdown',
}: LoginButtonProps) {
  const restoreAccountSettingsPage =
    menuPresentation === 'sheet'
      ? readMobileSettingsDrawerRestore('right')
      : null;
  const [isMenuOpen, setIsMenuOpen] = useState(
    restoreAccountSettingsPage !== null,
  );
  const [accountSheetPage, setAccountSheetPage] = useState<
    'account' | 'settings'
  >(restoreAccountSettingsPage ? 'settings' : 'account');
  const [authReady, setAuthReady] = useState(false);
  const menuCloseTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const { t } = useTranslation();
  const { ready, authenticated, user } = usePrivy();
  const navigate = useNavigate();
  const { isLogin, userProfile, walletUsdcBalance, walletStoryBalance } =
    useGlobalStore();
  const { login, logout, isLogging, isLoggingOut } = useAppLogin();
  const { openDepositDialog, openWithdrawDialog } = useDialogStore();
  const { loginType, solanaAddress } = useAppPrivyAccount();
  const { addresses: embeddedAddresses } = usePrivyDepositAddresses();
  const chainlinks = useConfigStore((s) => s.chainlinks);
  const usdcToken = useConfigStore((s) => s.usdcToken);
  const storyToken = useConfigStore((s) => s.storyToken);
  const isSiteTop = appearance === 'siteTop';
  const isAvatarOnly = appearance === 'avatarOnly';

  useEffect(() => {
    if (restoreAccountSettingsPage) {
      clearMobileSettingsDrawerRestore('right');
    }
  }, [restoreAccountSettingsPage]);

  // 后端登录：首帧从 userToken 同步 isLogin，避免「登录/注册」闪现（与 Privy ready 无关）
  useLayoutEffect(() => {
    hydrateAuthFlowStoreFromStorage();
    useGlobalStore.setState({ isLogin: getIsLoginFromStorage() });
    setAuthReady(true);
  }, []);

  useEffect(() => {
    return () => {
      if (menuCloseTimerRef.current) {
        clearTimeout(menuCloseTimerRef.current);
      }
    };
  }, []);

  if (!authReady) {
    return (
      <div
        className={cn(
          'shrink-0 rounded-full',
          isAvatarOnly ? 'size-8' : 'h-10 w-[120px] md:w-[140px]',
        )}
        aria-hidden
      />
    );
  }

  /** Privy 会话：链上充值/提现/登出等，须等 ready + authenticated（与页面级 userToken 拦截分离） */
  const privySessionReady = ready && authenticated && !!user;

  // 充值：仅邮箱登录展示入口，打开 Offline 转账弹窗

  const handleDepositClick = () => {
    if (!privySessionReady) {
      return;
    }

    openDepositDialog();
    setIsMenuOpen(false);
  };

  // 提现：依赖 Privy 钱包会话就绪后再打开弹窗

  const handleWithdrawClick = () => {
    if (!privySessionReady) {
      return;
    }

    openWithdrawDialog();
    setIsMenuOpen(false);
  };

  const handleAccountSettingsOpen = () => {
    setAccountSheetPage('settings');
  };

  const handleAccountSettingsBack = () => {
    setAccountSheetPage('account');
  };

  // 登出：不依赖 Privy ready；远端 privyLogout 不可用时仍清本地登录态

  const handleLogoutClick = () => {
    if (isLoggingOut) {
      return;
    }

    void logout();
  };

  // 交易记录：按 VITE_CHAIN + chainlinks.explorer 打开对应环境的链浏览器账户页

  const handleTransactionHistoryClick = (walletAddressForExplorer: string) => {
    const address = walletAddressForExplorer.trim();
    if (!address) {
      return;
    }

    const explorerUrl = buildExplorerAccountUrl(
      getChainExplorer(chainlinks, getCurrentChain()),
      address,
    );
    if (!explorerUrl) {
      return;
    }

    window.open(explorerUrl, '_blank', 'noopener,noreferrer');
    setIsMenuOpen(false);
  };

  // 访客「登录/注册」：仅在本组件因 ready 为真而渲染时触发，由 Privy 打开登录

  const handleLoginClick = () => {
    login();
  };

  const handleBuyStoryClick = () => {
    window.open(PLATO_TRADE_URL, '_blank', 'noopener,noreferrer');
    setIsMenuOpen(false);
  };

  // 触发条件：siteTop 顶栏悬停整块账户 pill（USDC 余额 + 头像）
  // 行为目的：打开钱包浮窗；移出触发区与浮窗后延迟关闭，便于鼠标移入菜单
  const handleSiteTopMenuOpen = () => {
    if (!isSiteTop || isLoggingOut) {
      return;
    }

    if (menuCloseTimerRef.current) {
      clearTimeout(menuCloseTimerRef.current);
    }

    setIsMenuOpen(true);
  };

  const handleSiteTopMenuClose = () => {
    if (!isSiteTop) {
      return;
    }

    menuCloseTimerRef.current = setTimeout(() => {
      setIsMenuOpen(false);
    }, 120);
  };

  // 菜单开关：处理 sheet/dropdown 关闭时重置页面，siteTop 时清除延迟关闭定时器
  const handleMenuOpenChange = (nextOpen: boolean) => {
    if (isLoggingOut) {
      return;
    }

    if (!nextOpen) {
      setAccountSheetPage('account');
    }

    if (isSiteTop && !nextOpen && menuCloseTimerRef.current) {
      clearTimeout(menuCloseTimerRef.current);
    }

    setIsMenuOpen(nextOpen);
  };

  if (isLogin) {
    const avatarUserId =
      userProfile?.userId != null ? String(userProfile.userId) : '';
    const profileAvatarUrl = userProfile?.avatarUrl?.trim() || undefined;

    const email =
      user?.email?.address ??
      (typeof userProfile?.email === 'string' ? userProfile.email : '') ??
      '';
    const walletAddress =
      user?.wallet?.address ?? userProfile?.walletAddress ?? '';
    const transactionHistoryAddress = solanaAddress ?? '';
    const isEmailLogin = loginType === 'email';

    // 邮箱：Privy 嵌入式 Solana；钱包：直连 Solana
    const displayedSolanaAddress = isEmailLogin
      ? embeddedAddresses.solana?.trim() || ''
      : solanaAddress?.trim() || '';

    const hasIdentity = Boolean(email) || Boolean(walletAddress);
    const nickname = userProfile?.nickname?.trim();
    const displayName = nickname
      ? nickname
      : email
        ? email
        : walletAddress
          ? formatAddress(walletAddress)
          : '—';
    const avatarFallbackChar =
      displayName !== '—' ? displayName.charAt(0).toUpperCase() : undefined;
    const accountType = !hasIdentity
      ? '—'
      : email
        ? t('邮箱账户')
        : t('钱包登录');

    async function handleCopySolanaAddress() {
      if (!displayedSolanaAddress) {
        toast.error(t('再试一次'));
        return;
      }

      try {
        await navigator.clipboard.writeText(displayedSolanaAddress);
        toast.success(t('地址已复制'));
      } catch (error) {
        console.error('Failed to copy Solana address:', error);
        toast.error(t('再试一次'));
      }
    }

    function handleNavigateToMyProfile() {
      void navigate({ to: '/profile' });
      setIsMenuOpen(false);
    }

    // 触发条件：点击顶栏头像，或账户浮窗顶部资料区（头像 + 昵称 + 账户类型）
    // 行为目的：与单独点头像一致，跳转个人主页并关闭菜单
    function handleProfileNavClick(event: MouseEvent<HTMLElement>) {
      event.stopPropagation();
      event.preventDefault();
      handleNavigateToMyProfile();
    }

    function renderProfileAvatarNavTarget(size: number) {
      return (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t('我的')}
          onClick={handleProfileNavClick}
          className="size-auto shrink-0 rounded-full p-0 hover:bg-transparent"
        >
          <UserProfileAvatarCircle
            userId={avatarUserId || undefined}
            avatarUrl={profileAvatarUrl}
            size={size}
            alt={displayName}
            fallbackChar={avatarFallbackChar}
          />
        </Button>
      );
    }

    if (isAvatarOnly && menuPresentation !== 'sheet') {
      return (
        <Button
          type="button"
          variant="ghost"
          className="size-8 rounded-full bg-transparent p-0 hover:bg-white/10 hover:text-white"
          aria-label={t('我的')}
          onClick={handleNavigateToMyProfile}
        >
          <UserProfileAvatarCircle
            userId={avatarUserId || undefined}
            avatarUrl={profileAvatarUrl}
            size={32}
            alt={displayName}
            fallbackChar={avatarFallbackChar}
          />
        </Button>
      );
    }

    const accountMenuShellClassName = cn(
      'inline-flex items-center rounded-full transition-opacity hover:opacity-90',
      'h-10 gap-0 py-0.5 pr-0.5',
      isSiteTop && 'bg-site-nav-item-active',
      !isSiteTop && 'bg-foreground',
    );

    const accountMenuTrigger = isLoggingOut ? (
      <Button
        type="button"
        disabled
        className={cn(
          AUTH_LOADING_BUTTON_CLASSNAME,
          isAvatarOnly && 'size-8 gap-0 p-0',
        )}
        aria-label={t('登出中...')}
      >
        <Spinner
          className={isAvatarOnly ? 'text-foreground' : 'text-background'}
        />
        {isAvatarOnly ? null : t('登出中...')}
      </Button>
    ) : isAvatarOnly ? (
      <Button
        type="button"
        variant="ghost"
        className={cn(
          'size-8 cursor-pointer rounded-full border-0 bg-transparent p-0 outline-none',
          'transition-opacity hover:bg-white/10 hover:text-white hover:opacity-90',
        )}
        aria-label={t('我的')}
      >
        <UserProfileAvatarCircle
          userId={avatarUserId || undefined}
          avatarUrl={profileAvatarUrl}
          size={32}
          alt={displayName}
          fallbackChar={avatarFallbackChar}
        />
      </Button>
    ) : (
      <Button
        type="button"
        variant="ghost"
        className={cn(
          'h-10 rounded-full border-0 py-0.5 pr-2 pl-3 hover:bg-transparent',
        )}
      >
        <span
          className={cn(
            'text-sm leading-5',
            isSiteTop
              ? 'font-normal text-foreground'
              : 'font-bold text-background',
          )}
        >
          {formatNumber(walletUsdcBalance, 2)} USDC
        </span>
      </Button>
    );

    const renderAccountMenuControl = (
      Trigger: typeof SheetTrigger | typeof DropdownMenuTrigger,
    ) =>
      isLoggingOut || isAvatarOnly ? (
        <Trigger render={accountMenuTrigger} />
      ) : (
        // biome-ignore lint/a11y/noStaticElementInteractions: siteTop 须整块 pill（余额+头像）悬停打开钱包浮窗
        <div
          className={accountMenuShellClassName}
          onMouseEnter={isSiteTop ? handleSiteTopMenuOpen : undefined}
          onMouseLeave={isSiteTop ? handleSiteTopMenuClose : undefined}
        >
          <Trigger render={accountMenuTrigger} />
          {renderProfileAvatarNavTarget(36)}
        </div>
      );

    const accountPanelContent = (
      <>
        <Button
          type="button"
          variant="ghost"
          aria-label={t('我的')}
          onClick={handleProfileNavClick}
          className={cn(
            // Layout & Positioning
            'flex h-auto min-w-0 w-full items-center justify-start gap-2',
            // Spacing
            'px-0 py-2',
            // Visual
            'rounded-xl',
            // Interactions & States
            'hover:bg-wallet-surface-muted',
          )}
        >
          <UserProfileAvatarCircle
            userId={avatarUserId || undefined}
            avatarUrl={profileAvatarUrl}
            size={44}
            alt={displayName}
            fallbackChar={avatarFallbackChar}
          />
          <div className="flex min-w-0 flex-1 flex-col gap-1 text-left">
            <span
              title={displayName !== '—' ? displayName : undefined}
              className="truncate text-[18px] leading-[26px] font-bold tracking-[-0.04px] text-foreground"
            >
              {displayName}
            </span>
            <span className="text-sm leading-5 text-wallet-text-tertiary">
              {accountType}
            </span>
          </div>
        </Button>

        <div className="mt-2 flex flex-col gap-2 px-0 py-0">
          {displayedSolanaAddress ? (
            <div className="flex items-center justify-between gap-3 rounded-xl bg-wallet-surface-muted p-3">
              <div className="flex items-center gap-1">
                <IconSolana className="size-5 shrink-0" />
                <span className="text-xs font-medium leading-4 tracking-[0.04px] text-foreground">
                  Solana
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium leading-4 tracking-[0.04px] text-foreground">
                  {formatAddress(displayedSolanaAddress)}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => {
                    void handleCopySolanaAddress();
                  }}
                  className="shrink-0 rounded-md hover:bg-background/70"
                  aria-label={t('复制地址')}
                >
                  <IconCopy className="size-5 text-foreground" />
                </Button>
              </div>
            </div>
          ) : null}

          {SHOW_DEV_ONLY_UI ? (
            <div className="flex items-center justify-between gap-3 rounded-xl bg-wallet-surface-muted p-3">
              <div className="flex items-center gap-3">
                <TokenAssetIcon symbol="STORY" iconUrl={storyToken?.icon} />
                <div className="flex flex-col gap-0.5">
                  <span className="text-[15px] leading-[22px] font-bold text-foreground">
                    STORY
                  </span>
                  <span className="text-xs leading-4 text-wallet-text-secondary">
                    Story
                  </span>
                </div>
              </div>
              <span className="text-[15px] leading-[22px] font-bold text-foreground">
                {formatNumber(walletStoryBalance, 2)}
              </span>
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-3 rounded-xl bg-wallet-surface-muted p-3">
            <div className="flex items-center gap-3">
              <TokenAssetIcon symbol="USDC" iconUrl={usdcToken?.icon} />
              <div className="flex flex-col gap-0.5">
                <span className="text-[15px] leading-[22px] font-bold text-foreground">
                  USDC
                </span>
                <span className="text-xs leading-4 text-wallet-text-secondary">
                  {'USD Coin'}
                </span>
              </div>
            </div>
            <span className="text-[15px] leading-[22px] font-bold text-foreground">
              {formatNumber(walletUsdcBalance, 2)}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-3">
          {SHOW_DEV_ONLY_UI ? (
            <Button
              type="button"
              variant="outline"
              onClick={handleBuyStoryClick}
              className={cn(
                'w-full rounded-xl border-[1.5px] border-wallet-divider bg-transparent px-4 py-2.5',
                'text-sm font-bold leading-5 text-foreground',
                'hover:bg-wallet-surface-muted',
              )}
            >
              {t('交易 · STORY')}
            </Button>
          ) : null}

          {isEmailLogin ? (
            <div className="grid grid-cols-2 gap-2.5">
              <Button
                type="button"
                disabled={!privySessionReady}
                onClick={handleDepositClick}
                className={cn(
                  'inline-flex w-full items-center justify-center',
                  'px-4 py-2.5',
                  'rounded-xl border-0 bg-foreground text-sm font-bold leading-5 text-background shadow-none',
                  'hover:opacity-90',
                )}
              >
                {t('充值')}
              </Button>
              <Button
                type="button"
                disabled={!privySessionReady}
                onClick={handleWithdrawClick}
                variant="outline"
                className={cn(
                  'rounded-xl border-[1.5px] border-solid border-wallet-divider bg-transparent px-4 py-2.5',
                  'text-sm font-bold leading-5 text-foreground',
                  'hover:bg-wallet-surface-muted',
                )}
              >
                {t('提现')}
              </Button>
            </div>
          ) : null}
        </div>

        <div className="my-4 h-px bg-wallet-divider" />

        <div className="-mx-4 flex flex-col gap-[2px]">
          <AccountActionItem
            presentation={menuPresentation}
            onClick={() => {
              void navigate({ to: '/creation-management' });
              setIsMenuOpen(false);
            }}
          >
            <IconCreationManagement className={WALLET_NAV_ICON_CLASS} />
            <span className={WALLET_NAV_LABEL_CLASS}>{t('内容管理')}</span>
            <IconMoreArrow className={WALLET_NAV_ARROW_CLASS} />
          </AccountActionItem>

          <AccountActionItem
            presentation={menuPresentation}
            onClick={() => {
              if (notifyLockedNavIfDisabled('/invite', t)) {
                return;
              }

              void navigate({ to: '/invite' });
              setIsMenuOpen(false);
            }}
          >
            <IconReferralEarnInvite className={WALLET_NAV_ICON_CLASS} />
            <span className={WALLET_NAV_LABEL_CLASS}>{t('邀请')}</span>
            <IconMoreArrow className={WALLET_NAV_ARROW_CLASS} />
          </AccountActionItem>

          <AccountActionItem
            presentation={menuPresentation}
            onClick={() => {
              if (notifyLockedNavIfDisabled('/income', t)) {
                return;
              }

              void navigate({ to: '/income' });
              setIsMenuOpen(false);
            }}
          >
            <IconCreatorsReasonToken className={WALLET_NAV_ICON_CLASS} />
            <span className={WALLET_NAV_LABEL_CLASS}>{t('收益')}</span>
            <IconMoreArrow className={WALLET_NAV_ARROW_CLASS} />
          </AccountActionItem>

          <AccountActionItem
            presentation={menuPresentation}
            disabled={!transactionHistoryAddress.trim()}
            onClick={() =>
              handleTransactionHistoryClick(transactionHistoryAddress)
            }
          >
            <IconHistory className={WALLET_NAV_ICON_CLASS} />
            <span className={WALLET_NAV_LABEL_CLASS}>{t('交易记录')}</span>
            <IconMoreArrow className={WALLET_NAV_ARROW_CLASS} />
          </AccountActionItem>

          {menuPresentation === 'sheet' ? (
            <AccountActionItem
              presentation={menuPresentation}
              onClick={handleAccountSettingsOpen}
            >
              <IconSiteNavSettings className={WALLET_NAV_ICON_CLASS} />
              <span className={WALLET_NAV_LABEL_CLASS}>{t('设置')}</span>
              <IconMoreArrow className={WALLET_NAV_ARROW_CLASS} />
            </AccountActionItem>
          ) : null}

          <AccountActionItem
            presentation={menuPresentation}
            disabled={isLoggingOut}
            className={WALLET_NAV_ITEM_LOGOUT_CLASS}
            onClick={handleLogoutClick}
          >
            {isLoggingOut ? (
              <Spinner className={WALLET_NAV_ICON_CLASS} />
            ) : (
              <IconLogout className={WALLET_NAV_ICON_CLASS} />
            )}
            <span className={WALLET_NAV_LABEL_CLASS}>{t('退出登录')}</span>
            {menuPresentation === 'sheet' ? (
              <IconMoreArrow className={WALLET_NAV_ARROW_CLASS} />
            ) : null}
          </AccountActionItem>
        </div>
      </>
    );

    if (menuPresentation === 'sheet') {
      return (
        <Sheet
          open={isLoggingOut ? false : isMenuOpen}
          onOpenChange={handleMenuOpenChange}
        >
          {renderAccountMenuControl(SheetTrigger)}
          <SheetContent
            side="right"
            showCloseButton={false}
            overlayClassName="bg-black/40 backdrop-blur-[4px]"
            className={cn(
              '!w-[305px] !max-w-[305px] gap-0 overflow-hidden border-l-0 p-0',
              'bg-background text-foreground',
              'shadow-[-3px_4px_6px_rgb(0_0_0/0.08)]',
            )}
          >
            <SheetHeader className="sr-only">
              <SheetTitle>
                {t(accountSheetPage === 'account' ? '我的' : '设置')}
              </SheetTitle>
            </SheetHeader>
            {accountSheetPage === 'settings' ? (
              <MobileSettingsFlow
                drawerSide="right"
                initialPage={restoreAccountSettingsPage ?? 'settings'}
                onBack={handleAccountSettingsBack}
              />
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-[max(32px,env(safe-area-inset-top))] pb-[max(24px,env(safe-area-inset-bottom))]">
                {accountPanelContent}
              </div>
            )}
          </SheetContent>
        </Sheet>
      );
    }

    return (
      <DropdownMenu
        open={isLoggingOut ? false : isMenuOpen}
        onOpenChange={handleMenuOpenChange}
      >
        {renderAccountMenuControl(DropdownMenuTrigger)}
        <DropdownMenuContent
          className={cn(
            'w-[303px] overflow-clip px-4 pt-4 pb-4',
            'rounded-xl border-[0.5px] border-wallet-divider bg-popover',
            'shadow-[3px_4px_12px_0_rgb(0_0_0/0.08)] dark:shadow-[0_12px_32px_0_rgb(0_0_0/0.55)]',
            'text-popover-foreground ring-0',
          )}
          align="end"
          sideOffset={8}
          onMouseEnter={isSiteTop ? handleSiteTopMenuOpen : undefined}
          onMouseLeave={isSiteTop ? handleSiteTopMenuClose : undefined}
        >
          {accountPanelContent}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (isAvatarOnly) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={isLogging}
        onClick={handleLoginClick}
        className="size-8 rounded-full bg-white/10 p-0 text-white hover:bg-white/20 hover:text-white"
        aria-label={isLogging ? t('登录中...') : t('登录/注册')}
      >
        {isLogging ? (
          <Spinner className="text-white" />
        ) : (
          <IconAvatarDefault className="size-8" />
        )}
      </Button>
    );
  }

  return (
    <Button
      type="button"
      disabled={isLogging}
      onClick={handleLoginClick}
      className={AUTH_LOADING_BUTTON_CLASSNAME}
    >
      {isLogging ? (
        <>
          <Spinner className="text-background" />
          {t('登录中...')}
        </>
      ) : (
        t('登录/注册')
      )}
    </Button>
  );
}
