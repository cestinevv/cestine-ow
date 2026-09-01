import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { useAppPrivyAccount } from '@/hooks/useAppPrivyAccount';
import { useDialogStore } from '@/stores/dialogStore';

/**
 * 合约调用前 USDC 余额预检分流：邮箱弹窗充值，钱包 Toast 提示三方钱包充值。
 */
export function useNotifyInsufficientUsdc() {
  const { t } = useTranslation();
  const { loginType } = useAppPrivyAccount();
  const openInsufficientUsdcDialog = useDialogStore(
    (s) => s.openInsufficientUsdcDialog,
  );

  // shortfallUsdc：缺口金额（目标消耗 - 当前 USDC 余额）
  function notifyInsufficientUsdc(shortfallUsdc: string | number) {
    if (loginType === 'email') {
      openInsufficientUsdcDialog(String(shortfallUsdc));
      return;
    }

    toast.error(t('USDC 余额不足，可在三方钱包中进行充值'));
  }

  return { notifyInsufficientUsdc };
}
