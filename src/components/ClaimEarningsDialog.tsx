import { usePrivy } from '@privy-io/react-auth';
import type { AxiosError } from 'axios';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import type { WithdrawCreateResponse } from '@/api/__generated__/wallet/model/withdrawCreateResponse';
import type { WithdrawDetailResponse } from '@/api/__generated__/wallet/model/withdrawDetailResponse';
import {
  useWithdraw,
  queryWithdraw as withdrawOrderQuery,
} from '@/api/__generated__/wallet/userwallet-withdraw/userwallet-withdraw';
import { AppDialog } from '@/components/common/AppDialog';
import {
  APP_DIALOG_PRIMARY_BUTTON_CLASS,
  APP_DIALOG_SECONDARY_BUTTON_CLASS,
} from '@/components/common/appDialogButton';
import { Button } from '@/components/ui/button';
import { useAppPrivyAccount } from '@/hooks/useAppPrivyAccount';
import useGlobalStore from '@/stores/global';
import {
  refreshAllWalletBalances,
  refreshWalletAssets,
} from '@/stores/updater';
import { cn, formatNumber, toNumber } from '@/utils';

const WITHDRAW_SUCCESS_CODE = 100000;
const WITHDRAW_POLL_INTERVAL_MS = 3000;
const WITHDRAW_POLL_MAX_TIMES = 20;

type WalletApiEnvelope<T> = {
  code?: number;
  msg?: string;
  data?: T;
};

/** 与 WithdrawDetailResponse.status 字符串枚举一致 */
const WITHDRAW_STATUS_CONFIRMED = '2';
const WITHDRAW_STATUS_FAILED = '3';

type ClaimEarningsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 提取金额（用于展示与前端校验；POST /api/userWallet/withdraw 按可提现余额全额提取） */
  amount: number;
  /** 提取资产编码：USDC、STORY */
  assetCode: string;
  /** 弹窗中央展示文案（含单位）；未传则 `${amount} ${assetCode}` */
  amountDisplay?: string;
  /** 提取提交成功并关闭弹窗后的回调 */
  onSuccess?: () => void;
};

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });

function isWithdrawStatus(
  status: WithdrawDetailResponse['status'] | number | undefined,
  expected: string,
) {
  return status !== undefined && String(status) === expected;
}

// 提现提交成功后按订单号轮询状态，确认后刷新中心化可领取余额与链上钱包展示。
async function pollWithdrawOrderStatus(
  orderNo: string,
  assetCode: string,
  t: (key: string) => string,
  onConfirmed?: () => void,
) {
  for (let index = 0; index < WITHDRAW_POLL_MAX_TIMES; index += 1) {
    const orderResponse = await withdrawOrderQuery(orderNo);
    const orderPayload =
      orderResponse.data as WalletApiEnvelope<WithdrawDetailResponse>;
    const orderStatus = orderPayload.data?.status;

    if (isWithdrawStatus(orderStatus, WITHDRAW_STATUS_CONFIRMED)) {
      await refreshAllWalletBalances();
      const normalizedAsset = assetCode.toUpperCase();
      toast.success(
        normalizedAsset === 'STORY' ? t('STORY提现成功') : t('USDC提现成功'),
      );
      onConfirmed?.();
      return true;
    }

    if (isWithdrawStatus(orderStatus, WITHDRAW_STATUS_FAILED)) {
      toast.error(t('提现失败'));
      await refreshWalletAssets();
      return false;
    }

    if (index < WITHDRAW_POLL_MAX_TIMES - 1) {
      await sleep(WITHDRAW_POLL_INTERVAL_MS);
    }
  }

  return false;
}

export function ClaimEarningsDialog({
  open,
  onOpenChange,
  amount,
  assetCode,
  amountDisplay,
  onSuccess,
}: ClaimEarningsDialogProps) {
  const { t } = useTranslation();
  const { user } = usePrivy();
  const { isEmbeddedLogin, solanaAddress } = useAppPrivyAccount();
  const { mutateAsync: submitWithdraw, isPending: isWithdrawSubmitting } =
    useWithdraw();
  const claimableUsdcBalance = useGlobalStore(
    (state) => state.claimableUsdcBalance,
  );
  const claimableStoryBalance = useGlobalStore(
    (state) => state.claimableStoryBalance,
  );
  const profileWalletAddress = useGlobalStore(
    (state) => state.userProfile?.walletAddress,
  );

  const availableBalance = useMemo(() => {
    const normalizedAsset = assetCode.toUpperCase();

    if (normalizedAsset === 'STORY') {
      return claimableStoryBalance.available;
    }

    return claimableUsdcBalance.available;
  }, [
    assetCode,
    claimableStoryBalance.available,
    claimableUsdcBalance.available,
  ]);

  const resolvedAmountDisplay = useMemo(() => {
    if (amountDisplay) {
      return amountDisplay;
    }

    const value =
      availableBalance ??
      (Number.isFinite(amount) ? String(amount) : undefined);

    return `${formatNumber(value)} ${assetCode}`;
  }, [amountDisplay, availableBalance, amount, assetCode]);

  // 与 DepositDialog 一致：当前账户 Solana 地址；兜底用户资料主钱包地址。
  const toAddress = useMemo(() => {
    if (user && isEmbeddedLogin && solanaAddress) {
      return solanaAddress;
    }

    if (solanaAddress) {
      return solanaAddress;
    }

    if (profileWalletAddress?.trim()) {
      return profileWalletAddress.trim();
    }

    return '';
  }, [user, isEmbeddedLogin, solanaAddress, profileWalletAddress]);

  const handleCancel = () => {
    onOpenChange(false);
  };

  // 确认领取：POST /api/userWallet/withdraw，toAddress 为当前账户地址。
  const handleConfirmClaim = async () => {
    if (!toAddress) {
      toast.error(t('提现提交失败，请稍后重试'));
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error(t('请输入正确的提现金额'));
      return;
    }

    const available = toNumber(availableBalance ?? '0');
    if (Number.isFinite(available) && amount > available) {
      toast.error(t('提现金额不能超过可提现余额'));
      return;
    }

    try {
      const response = await submitWithdraw({
        data: {
          assetCode,
          toAddress,
        },
      });

      const payload =
        response.data as WalletApiEnvelope<WithdrawCreateResponse>;

      if (payload.code !== WITHDRAW_SUCCESS_CODE) {
        toast.error(payload.msg || t('提现提交失败，请稍后重试'));
        return;
      }

      const orderNo = payload.data?.orderNo;
      if (!orderNo) {
        toast.error(t('提现订单号获取失败，请稍后重试'));
        return;
      }

      toast.success(t('提现申请已提交'));
      onOpenChange(false);

      // 提交后先刷新可领取 USDC（后端可能已冻结/扣减可用余额）
      await refreshWalletAssets();
      onSuccess?.();

      void pollWithdrawOrderStatus(orderNo, assetCode, t, onSuccess);
    } catch (error) {
      const requestError = error as AxiosError<{ msg?: string }>;
      const errorMessage =
        requestError.response?.data?.msg || t('提现提交失败，请稍后重试');
      toast.error(errorMessage);
    }
  };

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('领取收益')}
      width={424}
      bodyScroll={false}
    >
      <div className="flex flex-col gap-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <p
            className={cn(
              'text-[15px] leading-[22px] font-medium text-muted-foreground',
            )}
          >
            {t('领取')}
          </p>
          <p
            className={cn(
              'text-2xl leading-[30px] font-bold tracking-[-0.1px] text-language-switcher-active',
            )}
          >
            {resolvedAmountDisplay}
          </p>
        </div>

        <div className="flex w-full gap-3">
          <Button
            type="button"
            variant="outline"
            className={APP_DIALOG_SECONDARY_BUTTON_CLASS}
            disabled={isWithdrawSubmitting}
            onClick={handleCancel}
          >
            {t('取消')}
          </Button>
          <Button
            type="button"
            className={APP_DIALOG_PRIMARY_BUTTON_CLASS}
            disabled={
              isWithdrawSubmitting ||
              !toAddress ||
              !Number.isFinite(amount) ||
              amount <= 0
            }
            onClick={() => void handleConfirmClaim()}
          >
            {isWithdrawSubmitting ? t('提交中') : t('确认领取')}
          </Button>
        </div>
      </div>
    </AppDialog>
  );
}
