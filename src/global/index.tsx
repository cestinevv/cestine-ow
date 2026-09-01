import { DepositDialog } from '@/components/deposit/DepositDialog';
import { InsufficientUsdcDialog } from '@/components/deposit/InsufficientUsdcDialog';
import { WithdrawDialog } from '@/components/WithdrawDialog';
import { InviteCodePromptController } from '@/features/invite/components/InviteCodePromptController';
import { AppAuthBridge } from '@/hooks/useAppLogin';
import { useDialogStore } from '@/stores/dialogStore';
import useGlobalStore from '@/stores/global';
import { SHOW_DEV_ONLY_UI } from '@/utils';

export function GlobalDialogs() {
  const userId = useGlobalStore((state) => state.userProfile?.userId);
  const depositDialogOpen = useDialogStore((s) => s.depositDialogOpen);
  const withdrawDialogOpen = useDialogStore((s) => s.withdrawDialogOpen);
  const insufficientUsdcDialogOpen = useDialogStore(
    (s) => s.insufficientUsdcDialogOpen,
  );

  return (
    <>
      <AppAuthBridge />
      {SHOW_DEV_ONLY_UI ? (
        <InviteCodePromptController key={userId ?? 'guest'} />
      ) : null}
      {depositDialogOpen && <DepositDialog />}
      {withdrawDialogOpen && <WithdrawDialog />}
      {insufficientUsdcDialogOpen && <InsufficientUsdcDialog />}
    </>
  );
}
