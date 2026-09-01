import { usePrivy } from '@privy-io/react-auth';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { IconAvatarDefault } from '@/assets/svg/IconAvatarDefault';
import IconMoreArrow from '@/assets/svg/IconMoreArrow';
import IconSiteNavSettings from '@/assets/svg/IconSiteNavSettings';
import IconSiteNavWhitepaperOff from '@/assets/svg/IconSiteNavWhitepaperOff';
import AppLoadingContainer from '@/components/common/AppLoadingContainer';
import { UserProfileAvatarCircle } from '@/components/common/UserProfileAvatar';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { NotificationCenterController } from '@/features/notification/components/NotificationCenterController';
import { NotificationPreviewItem } from '@/features/notification/components/NotificationPanel';
import { useNotificationPreview } from '@/features/notification/useNotificationData';
import { useAppLogin } from '@/hooks/useAppLogin';
import { MobileDrawerSubpage } from '@/layouts/components/MobileDrawerSubpage';
import { MobileSettingsFlow } from '@/layouts/components/MobileSettingsFlow';
import { MobileWatchHistoryPreview } from '@/layouts/components/MobileWatchHistoryPreview';
import { MOBILE_DRAWER_CARD_CLASS } from '@/layouts/components/mobileNavigationDrawerFormat';
import type { MobileSettingsPage } from '@/layouts/components/mobileSettingsDrawerRestore';
import useGlobalStore from '@/stores/global';
import { cn, formatAddress, SHOW_DEV_ONLY_UI } from '@/utils';

type MobileNavigationDrawerProps = {
  initialPage?: 'menu' | 'settings';
  initialSettingsPage?: MobileSettingsPage;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type MobileNavigationPage = 'menu' | 'settings';

const DRAWER_NAV_ITEM_CLASS = cn(
  'flex h-12 w-full items-center justify-start gap-3 rounded-xl px-3',
  'text-sm font-medium text-foreground no-underline',
  'hover:bg-muted hover:text-foreground',
);

export function MobileNavigationDrawer({
  initialPage = 'menu',
  initialSettingsPage = 'settings',
  open,
  onOpenChange,
}: MobileNavigationDrawerProps) {
  const [page, setPage] = useState<MobileNavigationPage>(initialPage);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const { t } = useTranslation();
  const { user } = usePrivy();
  const { login, isLogging } = useAppLogin();
  const { isLogin, userProfile } = useGlobalStore();
  const previewQuery = useNotificationPreview(
    open && isLogin && page === 'menu',
  );

  const avatarUserId =
    userProfile?.userId != null ? String(userProfile.userId) : '';
  const profileAvatarUrl = userProfile?.avatarUrl?.trim() || undefined;
  const email =
    user?.email?.address ??
    (typeof userProfile?.email === 'string' ? userProfile.email : '');
  const walletAddress =
    user?.wallet?.address ?? userProfile?.walletAddress ?? '';
  const displayName =
    userProfile?.nickname?.trim() ||
    email ||
    (walletAddress ? formatAddress(walletAddress) : '—');
  const avatarFallbackChar =
    displayName !== '—' ? displayName.charAt(0).toUpperCase() : undefined;

  const handleLoginClick = () => {
    handleDrawerOpenChange(false);
    login();
  };

  const handleWhitepaperClick = () => {
    handleDrawerOpenChange(false);
  };

  const handleDrawerOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setPage('menu');
    }
    onOpenChange(nextOpen);
  };

  const handleSettingsOpen = () => {
    setPage('settings');
  };

  const handleSettingsBack = () => {
    setPage('menu');
  };

  // 触发条件：点击观看历史入口或预览卡片；关闭抽屉并进入对应页面
  const handleWatchHistoryNavigate = () => {
    handleDrawerOpenChange(false);
  };

  const handleNotificationsOpen = (onNotificationOpen: () => void) => {
    onNotificationOpen();
    handleDrawerOpenChange(false);
    setNotificationOpen(true);
  };

  const handleNotificationsBack = (onNotificationClose: () => void) => {
    onNotificationClose();
    setNotificationOpen(false);
  };

  const handleNotificationPageOpenChange = (
    nextOpen: boolean,
    onNotificationOpen: () => void,
    onNotificationClose: () => void,
  ) => {
    if (nextOpen) {
      onNotificationOpen();
    } else {
      onNotificationClose();
    }
    setNotificationOpen(nextOpen);
  };

  const handleNotificationRequestClose = () => {
    setNotificationOpen(false);
  };

  return (
    <NotificationCenterController
      active={notificationOpen}
      isLogin={isLogin}
      onRequestClose={handleNotificationRequestClose}
      unreadEnabled={open || notificationOpen}
    >
      {({ hasUnread, onClose, onOpen, panel }) => (
        <>
          <Sheet open={open} onOpenChange={handleDrawerOpenChange}>
            <SheetContent
              side="left"
              showCloseButton={false}
              overlayClassName="bg-black/40 backdrop-blur-[4px]"
              className={cn(
                '!w-[305px] !max-w-[305px] gap-0 overflow-hidden border-r-0 p-0',
                'bg-muted text-foreground',
                'shadow-[3px_4px_6px_rgb(0_0_0/0.08)]',
              )}
            >
              <SheetHeader className="sr-only">
                <SheetTitle>{t(page === 'menu' ? '菜单' : '设置')}</SheetTitle>
              </SheetHeader>

              {page === 'settings' ? (
                <MobileSettingsFlow
                  drawerSide="left"
                  initialPage={initialSettingsPage}
                  onBack={handleSettingsBack}
                />
              ) : (
                <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pt-[max(32px,env(safe-area-inset-top))] pb-[max(24px,env(safe-area-inset-bottom))]">
                  {isLogin ? (
                    <div className="flex min-w-0 items-center gap-3 py-2">
                      <UserProfileAvatarCircle
                        userId={avatarUserId || undefined}
                        avatarUrl={profileAvatarUrl}
                        size={44}
                        alt={displayName}
                        fallbackChar={avatarFallbackChar}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[18px] leading-[26px] font-bold text-foreground">
                          {displayName}
                        </p>
                        {email ? (
                          <p className="truncate text-xs leading-4 text-muted-foreground">
                            {email}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={isLogging}
                      onClick={handleLoginClick}
                      className="h-auto w-full justify-start gap-3 rounded-xl px-0 py-2"
                    >
                      <IconAvatarDefault className="size-11" />
                      <span className="text-[18px] leading-[26px] font-bold">
                        {isLogging ? t('登录中...') : t('登录/注册')}
                      </span>
                    </Button>
                  )}

                  {isLogin ? (
                    <div className="mt-4 flex flex-col gap-3">
                      <section className={MOBILE_DRAWER_CARD_CLASS}>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => handleNotificationsOpen(onOpen)}
                          className="h-5 w-full justify-start gap-1 rounded-none p-0 hover:bg-transparent"
                        >
                          <span className="text-sm leading-5 font-bold">
                            {t('通知消息')}
                          </span>
                          {hasUnread ? (
                            <span
                              className="size-1.5 rounded-full bg-destructive"
                              aria-hidden
                            />
                          ) : null}
                          <IconMoreArrow className="ml-auto h-4 w-2 text-muted-foreground" />
                        </Button>

                        <AppLoadingContainer
                          data={previewQuery.data ?? []}
                          isLoading={previewQuery.isLoading}
                          isError={previewQuery.isError}
                          minHeight={80}
                          scrollable={false}
                          emptyContent={
                            <p className="text-center text-xs text-muted-foreground">
                              {t('暂无通知')}
                            </p>
                          }
                          stateClassName="text-xs"
                        >
                          <div className="flex flex-col gap-3 pt-3">
                            {(previewQuery.data ?? []).map((item, index) => (
                              <NotificationPreviewItem
                                key={item.id ?? `${item.eventType}-${index}`}
                                item={item}
                              />
                            ))}
                          </div>
                        </AppLoadingContainer>
                      </section>

                      <MobileWatchHistoryPreview
                        enabled={open && page === 'menu'}
                        onNavigate={handleWatchHistoryNavigate}
                      />
                    </div>
                  ) : null}

                  <nav className="mt-auto pt-6" aria-label={t('菜单')}>
                    <ul className="flex flex-col gap-1">
                      {SHOW_DEV_ONLY_UI ? (
                        <li>
                          <Button
                            variant="ghost"
                            nativeButton={false}
                            render={
                              <Link
                                to="/whitepaper"
                                preload="intent"
                                onClick={handleWhitepaperClick}
                              />
                            }
                            className={DRAWER_NAV_ITEM_CLASS}
                          >
                            <IconSiteNavWhitepaperOff className="size-6" />
                            <span className="min-w-0 flex-1 text-left">
                              {t('白皮书')}
                            </span>
                            <IconMoreArrow className="h-4 w-2 text-muted-foreground" />
                          </Button>
                        </li>
                      ) : null}
                      <li>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={handleSettingsOpen}
                          className={DRAWER_NAV_ITEM_CLASS}
                        >
                          <IconSiteNavSettings className="size-6" />
                          <span className="min-w-0 flex-1 text-left">
                            {t('设置')}
                          </span>
                          <IconMoreArrow className="h-4 w-2 text-muted-foreground" />
                        </Button>
                      </li>
                    </ul>
                  </nav>
                </div>
              )}
            </SheetContent>
          </Sheet>

          <Sheet
            open={notificationOpen}
            onOpenChange={(nextOpen) =>
              handleNotificationPageOpenChange(nextOpen, onOpen, onClose)
            }
          >
            <SheetContent
              side="right"
              showCloseButton={false}
              overlayClassName="bg-background"
              className="!inset-0 !h-dvh !w-screen gap-0 overflow-hidden border-0 bg-background p-0 shadow-none sm:!max-w-none"
            >
              <SheetHeader className="sr-only">
                <SheetTitle>{t('通知消息')}</SheetTitle>
              </SheetHeader>
              <MobileDrawerSubpage
                titleKey="通知消息"
                contentClassName="overflow-hidden px-0 pb-0"
                onBack={() => handleNotificationsBack(onClose)}
              >
                {panel}
              </MobileDrawerSubpage>
            </SheetContent>
          </Sheet>
        </>
      )}
    </NotificationCenterController>
  );
}
