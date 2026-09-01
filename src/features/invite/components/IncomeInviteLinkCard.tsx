import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import IconCopy from '@/assets/svg/IconCopy';
import IconMoreArrow from '@/assets/svg/IconMoreArrow';
import { Button } from '@/components/ui/button';
import { cn, formatNumber } from '@/utils';

type IncomeInviteLinkCardProps = {
  inviteCode?: string;
  totalInviteCount?: string;
  cumulativeInviteStoryEarnings?: string;
  onInviteCountClick: () => void;
  onEarningsClick: () => void;
};

function formatStatValue(value?: string) {
  return value === undefined ? '-' : formatNumber(value, 0);
}

export function IncomeInviteLinkCard({
  inviteCode,
  totalInviteCount,
  cumulativeInviteStoryEarnings,
  onInviteCountClick,
  onEarningsClick,
}: IncomeInviteLinkCardProps) {
  const { t } = useTranslation();

  // 与复制逻辑共用同一串：当前站点 origin + ?code=邀请码（避免展示与剪贴板不一致）。
  const inviteLink = useMemo(() => {
    if (!inviteCode || typeof window === 'undefined') {
      return '';
    }

    return `${window.location.origin}?code=${encodeURIComponent(inviteCode)}`;
  }, [inviteCode]);

  async function handleCopyInviteLink() {
    if (!inviteLink) {
      toast.error(t('再试一次'));

      return;
    }

    try {
      await navigator.clipboard.writeText(inviteLink);
      toast.success(t('链接已复制'));
    } catch {
      toast.error(t('再试一次'));
    }
  }

  async function handleCopyInviteCode() {
    if (!inviteCode) {
      toast.error(t('再试一次'));

      return;
    }

    try {
      await navigator.clipboard.writeText(inviteCode);
      toast.success(t('邀请码已复制'));
    } catch {
      toast.error(t('再试一次'));
    }
  }

  return (
    <section
      className={cn(
        'flex w-full flex-col gap-6 rounded-2xl bg-card p-4',
        'md:p-5',
      )}
      aria-labelledby="income-invite-link-heading"
    >
      <h2
        id="income-invite-link-heading"
        className="text-base leading-6 font-bold text-foreground"
      >
        {t('分享专属邀请链接或邀请码')}
      </h2>

      <div className="flex flex-col gap-3 md:grid md:grid-cols-2">
        <div className="flex min-w-0 items-center gap-4 rounded-xl border border-border p-4">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="text-base leading-6 font-bold text-wallet-text-secondary">
              {t('邀请链接')}
            </span>
            <span
              className="truncate text-base leading-6 text-foreground"
              suppressHydrationWarning
            >
              {inviteLink || '-'}
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleCopyInviteLink}
            className="size-8 shrink-0 rounded-lg text-wallet-text-secondary"
            aria-label={t('复制链接')}
          >
            <IconCopy className="size-6" />
          </Button>
        </div>

        <div className="flex min-w-0 items-center gap-4 rounded-xl border border-border p-4">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="text-base leading-6 font-bold text-wallet-text-secondary">
              {t('邀请码')}
            </span>
            <span className="truncate text-base leading-6 text-foreground">
              {inviteCode || '-'}
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleCopyInviteCode}
            className="size-8 shrink-0 rounded-lg text-wallet-text-secondary"
            aria-label={t('复制邀请码')}
          >
            <IconCopy className="size-6" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button
          type="button"
          variant="ghost"
          onClick={onInviteCountClick}
          className="h-auto min-w-0 justify-between rounded-xl border border-border p-4 text-left hover:bg-muted/50"
        >
          <span className="flex min-w-0 flex-col gap-1">
            <span className="text-[13px] leading-[18px] font-normal text-wallet-text-secondary">
              {t('已邀请')}
            </span>
            <strong className="truncate text-3xl leading-9 font-bold tracking-[-0.12px] text-foreground">
              {formatStatValue(totalInviteCount)}
            </strong>
          </span>
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-wallet-text-secondary">
            <IconMoreArrow className="h-5 w-2.5" />
          </span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={onEarningsClick}
          className="h-auto min-w-0 justify-between rounded-xl border border-border p-4 text-left hover:bg-muted/50"
        >
          <span className="flex min-w-0 flex-col gap-1">
            <span className="text-[13px] leading-[18px] font-normal text-wallet-text-secondary">
              {t('收益')}
            </span>
            <span className="flex min-w-0 items-baseline gap-1">
              <strong className="truncate text-3xl leading-9 font-bold tracking-[-0.12px] text-foreground">
                {formatStatValue(cumulativeInviteStoryEarnings)}
              </strong>
              <span className="text-[13px] leading-[18px] text-wallet-text-tertiary">
                STORY
              </span>
            </span>
          </span>
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-wallet-text-secondary">
            <IconMoreArrow className="h-5 w-2.5" />
          </span>
        </Button>
      </div>
    </section>
  );
}
