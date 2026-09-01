import { Link } from '@tanstack/react-router';
import { type MouseEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';

import IconBottomNavPublish from '@/assets/svg/IconBottomNavPublish';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useAppLogin } from '@/hooks/useAppLogin';
import { SITE_PUBLISH_ITEMS } from '@/layouts/components/sitePublishItems';
import { handleLockedNavClick } from '@/routing/tempNavGate';
import useGlobalStore from '@/stores/global';
import { cn } from '@/utils';

export function MobilePublishSheet() {
  const { t } = useTranslation();
  const { login } = useAppLogin();
  const isLogin = useGlobalStore((state) => state.isLogin);
  const [open, setOpen] = useState(false);

  const handlePublishNavigation = (
    event: MouseEvent<HTMLAnchorElement>,
    to: string,
  ) => {
    setOpen(false);

    if (handleLockedNavClick(event, to, t)) {
      return;
    }

    if (isLogin) {
      return;
    }

    event.preventDefault();
    login();
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            className="h-full w-full rounded-none p-0 text-primary hover:bg-transparent hover:text-primary"
            aria-label={t('发布')}
          >
            <IconBottomNavPublish className="size-[42px] shrink-0" />
          </Button>
        }
      />
      <SheetContent
        side="bottom"
        showCloseButton={false}
        overlayClassName="bg-black/50 supports-backdrop-filter:backdrop-blur-md"
        className={cn(
          'gap-4 rounded-t-[16px] border-t-0 bg-background px-4 pt-0',
          'pb-[max(2.125rem,env(safe-area-inset-bottom))]',
        )}
      >
        <SheetHeader className="sr-only">
          <SheetTitle>{t('发布')}</SheetTitle>
        </SheetHeader>

        <div className="flex w-full items-center justify-center p-2.5">
          <div className="h-1 w-12 rounded-full bg-button-disabled-foreground" />
        </div>

        <div className="flex w-full flex-col gap-3">
          <div className="overflow-hidden rounded-[12px] bg-secondary">
            {SITE_PUBLISH_ITEMS.map(({ mobileLabelKey, to, Icon }, index) => (
              <div key={to}>
                <Button
                  variant="ghost"
                  nativeButton={false}
                  render={
                    <Link
                      to={to}
                      onClick={(event) => handlePublishNavigation(event, to)}
                    />
                  }
                  className={cn(
                    'h-auto w-full justify-center gap-3 rounded-none border-0 p-4',
                    'text-[15px] leading-[22px] font-medium text-foreground',
                    'hover:bg-muted/60',
                  )}
                >
                  <Icon className="size-6 shrink-0" />
                  <span>{t(mobileLabelKey)}</span>
                </Button>
                {index < SITE_PUBLISH_ITEMS.length - 1 ? (
                  <div className="mx-6 h-px bg-border" />
                ) : null}
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            className={cn(
              'h-[42px] w-full rounded-[12px] border-[1.5px] px-4 py-2.5',
              'text-[13px] leading-[18px] font-medium text-foreground',
            )}
          >
            {t('取消')}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
