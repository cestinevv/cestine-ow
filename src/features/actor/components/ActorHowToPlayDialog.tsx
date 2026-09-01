import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import IconArrowRight from '@/assets/svg/IconArrowRight';
import { AppDialog } from '@/components/common/AppDialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils';

import {
  ACTOR_HOW_TO_PLAY_PANELS,
  ACTOR_HOW_TO_PLAY_TABS,
  ActorHowToPlayTab,
} from '../actorHowToPlayContent';

const DREAM_OS_URL = 'https://www.dreamos.xyz/';

type ActorHowToPlayDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ActorHowToPlayDialog({
  open,
  onOpenChange,
}: ActorHowToPlayDialogProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState(ActorHowToPlayTab.Sign);

  useEffect(() => {
    if (open) {
      setActiveTab(ActorHowToPlayTab.Sign);
    }
  }, [open]);

  const panel = ACTOR_HOW_TO_PLAY_PANELS[activeTab];

  // 切换签约 / 发行说明 Tab
  const handleSelectTab = (tab: ActorHowToPlayTab) => () => {
    setActiveTab(tab);
  };

  // 关闭玩法说明弹窗
  const handleClose = () => {
    onOpenChange(false);
  };

  // 去创作：新开 DreamOS，并关闭说明弹窗
  const handleGoCreate = () => {
    window.open(DREAM_OS_URL, '_blank', 'noopener,noreferrer');
    handleClose();
  };

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('角色 IP 怎么玩')}
      hideHeader
      width={500}
      bodyClassName="p-4"
    >
      <div className="flex w-full flex-col gap-6">
        <header className="flex w-full flex-col items-center">
          <h2 className="m-0 w-full text-center text-lg leading-[26px] font-bold tracking-[-0.04px] text-foreground">
            {t('角色 IP 怎么玩')}
          </h2>
        </header>

        <div
          role="tablist"
          aria-label={t('角色 IP 怎么玩')}
          className="flex w-full rounded-xl bg-page-thirdly p-1"
        >
          {ACTOR_HOW_TO_PLAY_TABS.map((tab) => {
            const active = activeTab === tab.key;

            return (
              <Button
                key={tab.key}
                type="button"
                role="tab"
                variant="ghost"
                aria-selected={active}
                onClick={handleSelectTab(tab.key)}
                className={cn(
                  'h-auto min-w-0 flex-1 flex-col items-center gap-0.5 rounded-[11px] p-3',
                  'whitespace-normal text-center',
                  active
                    ? cn(
                        'bg-card text-foreground shadow-[0_1px_8px_rgba(0,0,0,0.08)]',
                        'dark:bg-muted',
                        'hover:bg-card hover:text-foreground dark:hover:bg-muted',
                      )
                    : cn(
                        'bg-transparent text-muted-foreground',
                        'hover:bg-transparent hover:text-muted-foreground',
                      ),
                )}
              >
                <span className="w-full text-[17px] leading-[25px] font-bold">
                  {t(tab.titleKey)}
                </span>
                <span className="w-full text-xs leading-4 font-medium tracking-[0.04px] text-muted-foreground">
                  {t(tab.subtitleKey)}
                </span>
              </Button>
            );
          })}
        </div>

        <p
          className={cn(
            'w-full rounded-md bg-secondary px-4 py-3',
            'text-[17px] leading-[25px] font-bold text-foreground',
          )}
        >
          {t(panel.positioningKey)}
        </p>

        <div className="flex w-full flex-col gap-3">
          <section className="flex flex-col gap-0.5">
            <h3 className="m-0 text-sm leading-5 font-bold text-foreground">
              {t('适合人群')}
            </h3>
            <p className="text-sm leading-5 text-muted-foreground">
              {t(panel.audiencePrefixKey)}
              <span className="text-foreground">
                {t(panel.audienceEmphasisKey)}
              </span>
            </p>
          </section>

          <section className="flex flex-col gap-0.5">
            <h3 className="m-0 text-sm leading-5 font-bold text-foreground">
              {t('玩法指南')}
            </h3>
            <p className="text-sm leading-5 text-muted-foreground">
              {t(panel.guideBodyKey)}
            </p>
          </section>

          <section className="flex flex-col gap-0.5">
            <h3 className="m-0 text-sm leading-5 font-bold text-foreground">
              {t(panel.rightsTitleKey)}
            </h3>
            {panel.rights.map((right) => (
              <p
                key={right.bodyKey}
                className={cn(
                  'w-full rounded-md bg-secondary px-4 py-3',
                  'text-sm leading-5 text-muted-foreground',
                )}
              >
                {'labelKey' in right ? (
                  <>
                    <strong className="font-bold text-foreground">
                      {t(right.labelKey)}
                    </strong>
                    {t(right.bodyKey)}
                  </>
                ) : (
                  t(right.bodyKey)
                )}
              </p>
            ))}
          </section>
        </div>

        {panel.showCreateCta ? (
          <div className="flex w-full flex-col items-center gap-2.5 rounded-md bg-secondary p-4">
            <p className="w-full text-center text-[15px] leading-[22px] text-foreground">
              {t('可用 DreamOS 一键生成角色 IP 与 AI 短剧，高效产出优质内容')}
            </p>
            <Button
              type="button"
              onClick={handleGoCreate}
              className={cn(
                'h-auto w-full shrink-0 gap-2 rounded-xl px-4 py-2.5',
                'bg-foreground text-sm leading-5 font-bold text-background',
                'hover:bg-foreground/90',
              )}
            >
              {t('去创作')}
              <IconArrowRight className="size-5" />
            </Button>
          </div>
        ) : null}

        <Button
          type="button"
          variant="outline"
          onClick={handleClose}
          className="h-11 w-full rounded-xl text-sm leading-5 font-bold"
        >
          {t('知道了')}
        </Button>
      </div>
    </AppDialog>
  );
}
