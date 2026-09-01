import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { formatActorIpDisplay } from '@/features/actor/actorFormat';
import { DRAMA_FLOW_ROLE_COVER_ASPECT_CLASS } from '@/features/drama-flow/constants/dramaFlowRoleGrid';
import { cn } from '@/utils';

type DramaFlowThirdRoleCardProps = {
  name: string;
  actorId?: string;
  coverUrl?: string;
  removeDisabled: boolean;
  onRemove: () => void;
};

export function DramaFlowThirdRoleCard({
  name,
  actorId,
  coverUrl,
  removeDisabled,
  onRemove,
}: DramaFlowThirdRoleCardProps) {
  const { t } = useTranslation();

  const handleRemove = () => {
    onRemove();
  };

  return (
    <article
      className={cn(
        'flex flex-col overflow-hidden rounded-[10px] bg-card',
        'shadow-[0px_4px_20px_rgba(0,0,0,0.05)]',
      )}
    >
      <div
        data-slot="drama-flow-bound-ip-card"
        className={cn('flex h-full w-full flex-col overflow-hidden', 'bg-card')}
      >
        <div
          className={cn(
            'relative w-full shrink-0 overflow-hidden bg-muted',
            DRAMA_FLOW_ROLE_COVER_ASPECT_CLASS,
          )}
        >
          {coverUrl ? (
            <img
              alt=""
              src={coverUrl}
              className="absolute inset-0 size-full object-cover"
            />
          ) : null}
        </div>
        <div className={cn('flex flex-col gap-3', 'p-4')}>
          <div className={cn('flex min-w-0 flex-col gap-2')}>
            <h3
              className={cn(
                'truncate text-base leading-6 font-bold tracking-normal',
                'text-foreground',
              )}
            >
              {name}
            </h3>
            {actorId ? (
              <p
                className={cn(
                  'truncate text-xs leading-4 font-normal tracking-[0.04px]',
                  'text-muted-foreground',
                )}
              >
                {t('IP {{code}}', {
                  code: formatActorIpDisplay(actorId),
                })}
              </p>
            ) : null}
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={removeDisabled}
            onClick={handleRemove}
            className={cn(
              'h-11 w-full rounded-xl border-[1.5px] border-border px-4 py-2.5',
              'text-sm leading-5 font-bold shadow-none',
              removeDisabled
                ? 'cursor-not-allowed text-muted-foreground/40 hover:bg-card'
                : 'text-foreground hover:bg-muted/30',
            )}
          >
            {removeDisabled ? t('已绑定') : t('移除')}
          </Button>
        </div>
      </div>
    </article>
  );
}
