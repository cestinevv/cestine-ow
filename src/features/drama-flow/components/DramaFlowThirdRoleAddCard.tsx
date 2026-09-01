import { useTranslation } from 'react-i18next';

import IconPlus from '@/assets/svg/IconPlus';
import { Button } from '@/components/ui/button';
import { DRAMA_FLOW_ROLE_COVER_ASPECT_CLASS } from '@/features/drama-flow/constants/dramaFlowRoleGrid';
import { cn } from '@/utils';

type DramaFlowThirdRoleAddCardProps = {
  className?: string;
  onOpenSelectDialog: () => void;
};

export function DramaFlowThirdRoleAddCard({
  className,
  onOpenSelectDialog,
}: DramaFlowThirdRoleAddCardProps) {
  const { t } = useTranslation();

  const handleOpenSelectDialog = () => {
    onOpenSelectDialog();
  };

  return (
    <Button
      type="button"
      variant="ghost"
      aria-label={t('选择角色 IP')}
      onClick={handleOpenSelectDialog}
      className={cn(
        // Override `Button` default `h-10` / `px-2.5` so the card height is controlled by inner layout.
        'relative flex h-auto w-full flex-col gap-0 overflow-hidden rounded-[10px] bg-muted',
        'shadow-[0px_4px_20px_rgba(0,0,0,0.05)]',
        'border-0 p-0 px-0 py-0',
        // 面板为 bg-card，hover 勿再用 card，改用略深的 secondary 保持对比
        'hover:bg-secondary',
        className,
      )}
    >
      {/* Layout parity: keep the same overall height as `DramaFlowThirdRoleCard` */}
      <div
        className={cn('w-full', DRAMA_FLOW_ROLE_COVER_ASPECT_CLASS)}
        aria-hidden
      />

      <div className="flex flex-col gap-3 p-4" aria-hidden>
        <div className="flex min-w-0 flex-col gap-2">
          <div className="h-6 w-full invisible" />
          <div className="h-4 w-full invisible" />
        </div>
        <div className="h-11 w-full rounded-xl border border-wallet-divider invisible" />
      </div>

      <div
        className={cn('absolute inset-0 flex items-center justify-center')}
        aria-hidden
      >
        <IconPlus className="size-6 text-foreground" />
      </div>
    </Button>
  );
}
