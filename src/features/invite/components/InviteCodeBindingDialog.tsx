import { useQueryClient } from '@tanstack/react-query';
import type { ChangeEvent, FormEvent } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import {
  getInviteInfoQueryKey,
  getUserInfoQueryKey,
  useBindInviteCode,
} from '@/api/__generated__/wallet/userwallet-user/userwallet-user';
import IconInviteBinding from '@/assets/svg/IconInviteBinding';
import { AppDialog } from '@/components/common/AppDialog';
import {
  APP_DIALOG_PRIMARY_BUTTON_CLASS,
  APP_DIALOG_SECONDARY_BUTTON_CLASS,
} from '@/components/common/appDialogButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type InviteCodeBindingDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prompt?: boolean;
  onBound?: () => void;
};

export function InviteCodeBindingDialog({
  open,
  onOpenChange,
  prompt = false,
  onBound,
}: InviteCodeBindingDialogProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [inviteCode, setInviteCode] = useState('');
  const bindInviteCodeMutation = useBindInviteCode({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: getInviteInfoQueryKey(),
        });
        await queryClient.invalidateQueries({
          queryKey: getUserInfoQueryKey(),
        });
        toast.success(t('绑定邀请码成功'));
        setInviteCode('');
        onBound?.();
        onOpenChange(false);
      },
    },
  });

  function handleOpenChange(nextOpen: boolean) {
    if (!bindInviteCodeMutation.isPending) {
      onOpenChange(nextOpen);
    }
  }

  function handleInviteCodeChange(event: ChangeEvent<HTMLInputElement>) {
    setInviteCode(event.target.value);
  }

  function handleCancel() {
    onOpenChange(false);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedInviteCode = inviteCode.trim();

    if (!normalizedInviteCode) {
      return;
    }

    bindInviteCodeMutation.mutate({
      data: { inviteCode: normalizedInviteCode },
    });
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={t('绑定邀请码')}
      width={343}
      bodyScroll={false}
      bodyClassName="p-4"
      hideHeader
      disablePointerDismissal
    >
      <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
        <div className="flex flex-col items-center gap-4 pt-2 text-center">
          <span className="flex size-11 items-center justify-center rounded-full bg-warning/12 text-warning">
            <IconInviteBinding className="size-6" />
          </span>
          <div className="flex flex-col gap-1">
            <h2 className="text-base leading-6 font-bold text-foreground">
              {t('绑定邀请码')}
            </h2>
            {prompt ? (
              <p className="text-sm leading-5 font-medium text-wallet-text-secondary">
                {t('跳过后可在邀请页绑定')}
              </p>
            ) : null}
          </div>
          <label className="sr-only" htmlFor="invite-code-binding-input">
            {t('输入邀请码')}
          </label>
          <Input
            id="invite-code-binding-input"
            value={inviteCode}
            onChange={handleInviteCodeChange}
            placeholder={t('输入邀请码')}
            autoComplete="off"
            className="h-12 rounded-2xl border-border bg-background px-4 py-3 text-[15px] leading-[22px] placeholder:text-wallet-text-tertiary"
          />
        </div>
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            className={APP_DIALOG_SECONDARY_BUTTON_CLASS}
            disabled={bindInviteCodeMutation.isPending}
            onClick={handleCancel}
          >
            {t('取消')}
          </Button>
          <Button
            type="submit"
            className={APP_DIALOG_PRIMARY_BUTTON_CLASS}
            disabled={!inviteCode.trim() || bindInviteCodeMutation.isPending}
          >
            {t('确定')}
          </Button>
        </div>
      </form>
    </AppDialog>
  );
}
