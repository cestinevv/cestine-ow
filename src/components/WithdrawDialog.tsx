import { PublicKey } from '@solana/web3.js';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import IconChevronDown from '@/assets/svg/IconChevronDown';
import IconScan from '@/assets/svg/IconScan';
import { AppDialog } from '@/components/common/AppDialog';
import { APP_DIALOG_PRIMARY_FULL_WIDTH_BUTTON_CLASS } from '@/components/common/appDialogButton';
import { TokenAssetIcon } from '@/components/common/TokenAssetIcon';
import { QrAddressScanOverlay } from '@/components/QrAddressScanOverlay';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { getSponsorSubmitErrorMessage } from '@/hooks/sponsor/sponsorSubmitResult';
import { useSponsorSubmitPrivyWithdraw } from '@/hooks/sponsor/useSponsorSubmitPrivyWithdraw';
import { useAppPrivyAccount } from '@/hooks/useAppPrivyAccount';
import { DepositAssetSymbol } from '@/hooks/useDepositConfig';
import { useGlobalConfig } from '@/hooks/useGlobalConfig';
import { useWithdrawConfig } from '@/hooks/useWithdrawConfig';
import { useDialogStore } from '@/stores/dialogStore';
import useGlobalStore from '@/stores/global';
import { cn, formatNumber, toDecimalPlaces } from '@/utils';
import { isGreaterThan, isLessThan, multipliedBy } from '@/utils/mathUtil';

const DEFAULT_WITHDRAW_CHAIN_CODE = 'SOL';

const WITHDRAW_NOTICES = [
  '最小提现金额：{{min}} {{token}}',
  '请仔细核对提现地址和网络，转账后无法撤回',
] as const;
const DEFAULT_WITHDRAW_SCALE = 2;

/**
 * 按 inputScale 截断提现金额草稿（仅保留数字与单个小数点，输入阶段不补零）。
 */
function filterWithdrawAmountInput(raw: string, maxFractionDigits: number) {
  const sanitized = raw.replace(/[^\d.]/g, '');
  const dotIndex = sanitized.indexOf('.');

  if (dotIndex === -1) {
    return sanitized;
  }

  if (maxFractionDigits <= 0) {
    return sanitized.slice(0, dotIndex);
  }

  const integerPart = sanitized.slice(0, dotIndex);
  const fractionalDigits = sanitized.slice(dotIndex + 1).replace(/\./g, '');

  return `${integerPart}.${fractionalDigits.slice(0, maxFractionDigits)}`;
}

/**
 * 将余额按 inputScale 向下截取为可填入金额（不四舍五入，去掉无意义尾零）。
 */
function floorWithdrawBalanceAmount(
  balance: string | undefined,
  maxFractionDigits: number,
) {
  if (balance === undefined || balance === '') {
    return '0';
  }

  const floored = toDecimalPlaces(balance, maxFractionDigits);
  if (floored === '-' || !floored.includes('.')) {
    return floored === '-' ? '0' : floored;
  }

  return floored.replace(/0+$/, '').replace(/\.$/, '');
}

/** 输入地址是否与当前账户地址为同一 Solana 公钥。 */
function isSameSolanaPublicKey(left: PublicKey, right: string | undefined) {
  const normalized = right?.trim();
  if (!normalized) {
    return false;
  }

  try {
    return left.equals(new PublicKey(normalized));
  } catch {
    return false;
  }
}

export function WithdrawDialog() {
  const { t } = useTranslation();
  const { solanaAddress } = useAppPrivyAccount();
  const { executeSponsorPrivyWithdraw, isReady: isWithdrawReady } =
    useSponsorSubmitPrivyWithdraw();
  const [isWithdrawSubmitting, setIsWithdrawSubmitting] = useState(false);

  const { chainlinks, currentChain, withdrawConfig } = useGlobalConfig();
  const { withdrawAssetOptions, applyWithdrawAsset } = useWithdrawConfig();
  const { walletUsdcBalance, walletStoryBalance, userProfile } =
    useGlobalStore();
  const { withdrawDialogOpen, closeWithdrawDialog } = useDialogStore();
  const [amount, setAmount] = useState('');
  const [address, setAddress] = useState('');
  const [addressError, setAddressError] = useState('');
  const [amountError, setAmountError] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<DepositAssetSymbol>(
    DepositAssetSymbol.Usdc,
  );
  const [isAddressScanOpen, setIsAddressScanOpen] = useState(false);
  const wasWithdrawDialogOpenRef = useRef(false);

  const tokenBalance = useMemo(() => {
    return selectedAsset === DepositAssetSymbol.Story
      ? walletStoryBalance
      : walletUsdcBalance;
  }, [walletStoryBalance, walletUsdcBalance, selectedAsset]);
  const selectedWithdrawAssetOption = useMemo(
    () =>
      withdrawAssetOptions.find((option) => option.symbol === selectedAsset),
    [selectedAsset, withdrawAssetOptions],
  );
  const withdrawChainCode =
    withdrawConfig?.chain ?? DEFAULT_WITHDRAW_CHAIN_CODE;
  const withdrawChainName = withdrawConfig?.chainName ?? 'Solana';
  const withdrawChainIcon =
    chainlinks?.[withdrawChainCode]?.icon ?? chainlinks?.[currentChain]?.icon;
  const minWithdrawAmount = Number(withdrawConfig?.minWithdraw ?? '0');
  const maxWithdrawAmount = Number(withdrawConfig?.maxWithdraw ?? '0');
  const withdrawDisplayScale =
    withdrawConfig?.token.scale ?? DEFAULT_WITHDRAW_SCALE;
  const withdrawInputScale =
    withdrawConfig?.token.inputScale ?? DEFAULT_WITHDRAW_SCALE;

  useEffect(() => {
    const fallbackAsset =
      withdrawAssetOptions[0]?.symbol ?? DepositAssetSymbol.Usdc;
    const configSymbol = withdrawConfig?.token.symbol?.toUpperCase();
    const syncedAsset = withdrawAssetOptions.some(
      (option) => option.symbol === configSymbol,
    )
      ? (configSymbol as DepositAssetSymbol)
      : fallbackAsset;

    if (withdrawDialogOpen) {
      setSelectedAsset(syncedAsset);

      if (syncedAsset !== configSymbol) {
        applyWithdrawAsset(syncedAsset);
      }

      wasWithdrawDialogOpenRef.current = true;
      return;
    }

    if (wasWithdrawDialogOpenRef.current) {
      setSelectedAsset(fallbackAsset);
      applyWithdrawAsset(fallbackAsset);
      setIsAddressScanOpen(false);
      wasWithdrawDialogOpenRef.current = false;
    }
  }, [
    withdrawDialogOpen,
    withdrawConfig?.token.symbol,
    applyWithdrawAsset,
    withdrawAssetOptions,
  ]);

  // 切换提现币种时同步全局配置，并清空已填金额避免沿用上一币种余额校验。
  const handleSelectAsset = (symbol: DepositAssetSymbol) => {
    setSelectedAsset(symbol);
    applyWithdrawAsset(symbol);
    setAmount('');
    setAmountError('');
  };

  // 编辑提现地址：输入中不提示格式错误；完整公钥若等于当前账户则立即拦截。
  const handleAddressChange = (value: string) => {
    setAddress(value);

    try {
      const parsedAddress = new PublicKey(value);
      if (
        isSameSolanaPublicKey(parsedAddress, solanaAddress) ||
        isSameSolanaPublicKey(parsedAddress, userProfile?.walletAddress)
      ) {
        setAddressError(t('提现地址不能是当前账户地址'));
        return;
      }
    } catch {
      // 输入未形成合法公钥时不展示格式错误
    }

    setAddressError('');
  };

  // 编辑提现金额输入，并按 inputScale 截断小数位。
  const handleAmountChange = (value: string) => {
    setAmount(filterWithdrawAmountInput(value, withdrawInputScale));
    setAmountError('');
  };

  // 一键填入「余额与配置 max 的较小值」，并按 inputScale 向下截取小数位。
  const handleFillMaxAmount = () => {
    const balanceAmount = floorWithdrawBalanceAmount(
      tokenBalance,
      withdrawInputScale,
    );

    if (
      maxWithdrawAmount > 0 &&
      isGreaterThan(balanceAmount, maxWithdrawAmount)
    ) {
      handleAmountChange(
        floorWithdrawBalanceAmount(
          String(maxWithdrawAmount),
          withdrawInputScale,
        ),
      );
      return;
    }

    handleAmountChange(balanceAmount);
  };

  const validateAddress = (value: string) => {
    if (!value) {
      return t('请输入提现地址');
    }

    let parsedAddress: PublicKey;
    try {
      parsedAddress = new PublicKey(value);
    } catch {
      return t('请输入有效的 Solana 钱包地址');
    }

    if (
      isSameSolanaPublicKey(parsedAddress, solanaAddress) ||
      isSameSolanaPublicKey(parsedAddress, userProfile?.walletAddress)
    ) {
      return t('提现地址不能是当前账户地址');
    }

    return '';
  };

  // 提现提交成功后按订单号轮询状态，确认后刷新钱包余额缓存。
  const validateAmount = (value: string) => {
    const numericAmount = Number(value);
    const availableBalance = Number(tokenBalance ?? '0');

    if (!value || Number.isNaN(numericAmount)) {
      return t('请输入正确的提现金额');
    }

    if (minWithdrawAmount > 0 && isLessThan(value, minWithdrawAmount)) {
      return t('提现金额不能低于 {{min}} {{token}}', {
        min: minWithdrawAmount,
        token: selectedAsset,
      });
    }

    if (maxWithdrawAmount > 0 && numericAmount > maxWithdrawAmount) {
      return t('提现金额不能高于 {{max}} {{token}}', {
        max: maxWithdrawAmount,
        token: selectedAsset,
      });
    }

    if (numericAmount > availableBalance) {
      return t('提现金额不能超过可提现余额');
    }

    return '';
  };

  // 提交提现：校验通过后调用去中心化提现代付接口，成功后关闭弹窗
  const handleSubmitWithdraw = async () => {
    const normalizedAddress = address.trim();
    const normalizedAmount = amount.trim();
    const nextAddressError = validateAddress(normalizedAddress);
    const nextAmountError = validateAmount(normalizedAmount);
    setAddressError(nextAddressError);
    setAmountError(nextAmountError);

    if (nextAddressError || nextAmountError) {
      return;
    }

    if (!isWithdrawReady) {
      toast.error(t('提现组件尚未就绪，请检查网络和登录状态'));
      return;
    }

    const currentTokenConfig = withdrawAssetOptions.find(
      (opt) => opt.symbol === selectedAsset,
    )?.token;

    if (!currentTokenConfig?.address) {
      toast.error(t('未找到选中代币的配置信息'));
      return;
    }

    try {
      setIsWithdrawSubmitting(true);
      // 将提现数额乘以精度得到最小单位
      const amountMinimalUnit = multipliedBy(
        normalizedAmount,
        10 ** currentTokenConfig.decimals,
      );

      await executeSponsorPrivyWithdraw({
        toAddress: normalizedAddress,
        amount: amountMinimalUnit,
        tokenAddress: currentTokenConfig.address,
        tokenDecimals: currentTokenConfig.decimals,
      });

      toast.success(t('提现转账已完成'));
      setAddress('');
      setAmount('');
      closeWithdrawDialog();
    } catch (error) {
      console.error('Failed to submit withdraw request:', error);
      toast.error(
        getSponsorSubmitErrorMessage(error, t, '提现提交失败，请稍后重试'),
      );
    } finally {
      setIsWithdrawSubmitting(false);
    }
  };

  // 弹层受控：仅在关闭意图（open=false）时同步 store，避免误响应 open=true。
  const handleWithdrawDialogOpenChange = (open: boolean) => {
    if (!open) {
      closeWithdrawDialog();
    }
  };

  // 打开移动端 H5 地址扫码层
  const handleOpenAddressScan = () => {
    setIsAddressScanOpen(true);
  };

  // 关闭地址扫码层
  const handleAddressScanOpenChange = (open: boolean) => {
    setIsAddressScanOpen(open);
  };

  // 扫码成功后回填提现地址，并立即校验（含不能提到自己）。
  const handleAddressScanned = (scannedAddress: string) => {
    setAddress(scannedAddress);
    setAddressError(validateAddress(scannedAddress));
  };

  return (
    <>
      <AppDialog
        open={withdrawDialogOpen}
        onOpenChange={handleWithdrawDialogOpenChange}
        title={t('提现')}
        width={500}
      >
        <div className={cn('flex flex-col', 'gap-4')}>
          {/* Figma 7689:105220 — 提现地址 */}
          <section
            aria-label={t('提现地址')}
            className={cn('flex flex-col', 'gap-2')}
          >
            <h3
              className={cn('text-base leading-6 font-medium text-foreground')}
            >
              {t('提现地址')}
            </h3>
            <div className={cn('flex flex-col', 'gap-1')}>
              <div
                className={cn(
                  'flex h-12 w-full items-center gap-3',
                  'py-2 pr-2.5 pl-4',
                  'rounded-xl bg-deposit-field-surface',
                )}
              >
                <Input
                  type="text"
                  value={address}
                  onChange={(e) => handleAddressChange(e.target.value)}
                  placeholder={t('输入接收 {{token}} 的钱包地址', {
                    token: selectedAsset,
                  })}
                  className={cn(
                    'h-auto min-w-0 flex-1 rounded-none border-0 bg-transparent p-0 shadow-none md:text-base',
                    'text-base leading-6 text-foreground placeholder:text-wallet-text-secondary',
                    'focus-visible:border-0 focus-visible:ring-0',
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleOpenAddressScan}
                  className={cn(
                    'size-6 shrink-0 text-wallet-text-secondary',
                    'hover:bg-transparent hover:text-foreground',
                    'md:hidden',
                  )}
                  aria-label={t('扫码填写地址')}
                >
                  <IconScan className="size-6" />
                </Button>
              </div>
              <p
                className={cn(
                  'text-xs leading-4 tracking-[0.04px] text-wallet-text-tertiary',
                )}
              >
                {t('请确认地址正确，转账后无法撤回')}
              </p>
              {addressError ? (
                <p className="text-xs leading-4 text-destructive">
                  {addressError}
                </p>
              ) : null}
            </div>
          </section>

          {/* Figma 7689:105220 — 币种 */}
          <section
            aria-label={t('币种')}
            className={cn('flex flex-col', 'gap-2')}
          >
            <h3
              className={cn('text-base leading-6 font-medium text-foreground')}
            >
              {t('币种')}
            </h3>
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  'flex h-12 w-full items-center justify-between gap-3',
                  'py-2 pr-2.5 pl-4',
                  'rounded-xl border border-border bg-background text-base leading-6 text-foreground',
                  'cursor-pointer outline-none transition-colors hover:bg-muted/50',
                  'focus-visible:ring-2 focus-visible:ring-ring',
                )}
              >
                <div className="flex items-center gap-3">
                  <TokenAssetIcon
                    symbol={selectedAsset}
                    iconUrl={selectedWithdrawAssetOption?.token.icon}
                  />
                  <span>{selectedAsset}</span>
                </div>
                <IconChevronDown className="size-6 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-(--anchor-width) min-w-(--anchor-width)"
              >
                {withdrawAssetOptions.map((option) => (
                  <DropdownMenuItem
                    key={option.symbol}
                    className="flex items-center gap-3"
                    onClick={() => handleSelectAsset(option.symbol)}
                  >
                    <TokenAssetIcon
                      symbol={option.symbol}
                      iconUrl={option.token.icon}
                    />
                    <span>{option.symbol}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </section>

          {/* Figma 7689:105220 — 网络（静态，无下拉箭头） */}
          <section
            aria-label={t('网络')}
            className={cn('flex flex-col', 'gap-2')}
          >
            <h3
              className={cn('text-base leading-6 font-medium text-foreground')}
            >
              {t('网络')}
            </h3>
            <div
              className={cn(
                'flex h-12 w-full items-center gap-3',
                'py-2 pr-2.5 pl-4',
                'rounded-xl border border-border bg-background text-base leading-6 text-foreground',
              )}
            >
              {withdrawChainIcon ? (
                <img
                  src={withdrawChainIcon}
                  alt={withdrawChainName}
                  className="size-8 rounded-full object-cover"
                />
              ) : (
                <div className="size-8 rounded-full bg-muted" />
              )}
              <span>{withdrawChainName}</span>
            </div>
          </section>

          {/* Figma 7689:105220 — 金额 + 最大 + 余额 */}
          <section
            aria-label={t('金额')}
            className={cn('flex flex-col', 'gap-2')}
          >
            <h3
              className={cn('text-base leading-6 font-medium text-foreground')}
            >
              {t('金额')}
            </h3>
            <div className={cn('flex flex-col', 'gap-2')}>
              <div
                className={cn(
                  'flex h-12 items-center gap-2',
                  'py-2 pr-2.5 pl-4',
                  'rounded-xl bg-deposit-field-surface',
                )}
              >
                <Input
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  placeholder={t('输入提现金额')}
                  className={cn(
                    'h-auto min-w-0 flex-1 rounded-none border-0 bg-transparent p-0 shadow-none md:text-base',
                    'text-base leading-6 text-foreground placeholder:text-wallet-text-secondary',
                    'focus-visible:border-0 focus-visible:ring-0',
                  )}
                />
                <span
                  className={cn(
                    'shrink-0 text-[15px] leading-5.5 text-wallet-text-secondary',
                  )}
                >
                  {selectedAsset}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleFillMaxAmount}
                  className={cn(
                    'h-auto shrink-0',
                    'px-3 py-1',
                    'rounded-lg border-border text-[13px] leading-4.5 font-bold text-foreground',
                    'hover:bg-muted/50',
                  )}
                >
                  {t('最大')}
                </Button>
              </div>
              <p
                className={cn(
                  'text-xs leading-4 tracking-[0.04px] text-wallet-text-secondary',
                )}
              >
                {t('余额 {{amount}} {{token}}', {
                  amount: formatNumber(
                    tokenBalance ?? '0',
                    withdrawDisplayScale,
                  ),
                  token: selectedAsset,
                })}
              </p>
              {amountError ? (
                <p className="text-xs leading-4 text-destructive">
                  {amountError}
                </p>
              ) : null}
            </div>
          </section>

          {/* Figma 7689:105220 — page&sheet/dark + white-to-dark */}
          <Button
            type="button"
            onClick={handleSubmitWithdraw}
            disabled={isWithdrawSubmitting}
            className={cn(
              APP_DIALOG_PRIMARY_FULL_WIDTH_BUTTON_CLASS,
              'border-0 shadow-none',
            )}
          >
            {isWithdrawSubmitting ? t('提现提交中...') : t('确认提现')}
          </Button>

          <section aria-label={t('注意事项')}>
            <ul
              className={cn(
                'flex list-disc flex-col',
                'pl-4.5',
                'text-xs leading-4 tracking-[0.04px] text-wallet-text-secondary',
              )}
            >
              {WITHDRAW_NOTICES.map((notice) => (
                <li key={notice}>
                  {t(notice, {
                    min: minWithdrawAmount,
                    token: selectedAsset,
                  })}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </AppDialog>

      <QrAddressScanOverlay
        open={isAddressScanOpen}
        onOpenChange={handleAddressScanOpenChange}
        onScanSuccess={handleAddressScanned}
      />
    </>
  );
}
