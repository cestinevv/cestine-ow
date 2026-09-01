import { useTranslation } from 'react-i18next';

import IconIssueSuccess from '@/assets/svg/IconIssueSuccess';
import IconX from '@/assets/svg/IconX';
import { AppDialog } from '@/components/common/AppDialog';
import { Button } from '@/components/ui/button';
import { DialogClose } from '@/components/ui/dialog';
import { formatActorIpDisplay } from '@/features/actor/actorFormat';
import { cn } from '@/utils';

type CreateActorSuccessDialogProps = {
  open: boolean;
  actorName: string;
  actorId: string;
  onOpenChange: (open: boolean) => void;
  onSign: () => void;
};

export function CreateActorSuccessDialog({
  open,
  actorName,
  actorId,
  onOpenChange,
  onSign,
}: CreateActorSuccessDialogProps) {
  const { t } = useTranslation();
  const displayName = actorName.trim() || t('叶某某');
  const actorIpLabel = formatActorIpDisplay(actorId);

  // 稍后再说 / ×：关闭发行成功弹窗
  function handleLater() {
    onOpenChange(false);
  }

  // 去签约：跳转角色详情页
  function handleSign() {
    onSign();
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('{{name}} · 发行成功！', { name: displayName })}
      hideHeader
      width={400}
      bodyScroll={false}
      bodyClassName="relative p-4"
    >
      <DialogClose
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 z-10 shrink-0 rounded-full"
            aria-label={t('关闭')}
            onClick={handleLater}
          />
        }
      >
        <IconX className="size-6 text-foreground" />
      </DialogClose>

      <div className="flex w-full flex-col items-center gap-6">
        <IconIssueSuccess className="size-16 text-actor-issue-success" />

        <div className="flex w-full flex-col items-center gap-3 text-center">
          <h2 className="m-0 w-full text-lg leading-[26px] font-bold tracking-[-0.04px] text-foreground">
            {t('{{name}} · 发行成功！', { name: displayName })}
          </h2>
          <div className="flex w-full flex-col items-center gap-1.5">
            <p className="w-full text-sm leading-5 font-medium text-muted-foreground">
              {t('角色 IP {{code}}', { code: actorIpLabel })}
            </p>
            <p className="w-full text-sm leading-5 font-medium text-actor-curve-accent">
              {t('发行者也需要签约才能获得该角色哦～')}
            </p>
          </div>
        </div>

        <footer className="flex w-full gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleLater}
            className={cn(
              'h-11 min-w-0 flex-1 overflow-hidden rounded-xl px-4 py-2.5',
              'text-sm leading-5 font-bold',
            )}
          >
            <span className="min-w-0 truncate">{t('稍后再说')}</span>
          </Button>
          <Button
            type="button"
            onClick={handleSign}
            className={cn(
              'h-11 min-w-0 flex-1 overflow-hidden rounded-xl px-4 py-2.5',
              'bg-foreground text-sm leading-5 font-bold text-background',
              'hover:bg-foreground/90',
            )}
          >
            <span className="min-w-0 truncate">{t('去签约')}</span>
          </Button>
        </footer>
      </div>
    </AppDialog>
  );
}
