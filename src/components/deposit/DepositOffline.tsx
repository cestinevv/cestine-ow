import { QRCodeCanvas } from 'qrcode.react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import IconChevronDown from '@/assets/svg/IconChevronDown';
import IconCopy from '@/assets/svg/IconCopy';
import { TokenAssetIcon } from '@/components/common/TokenAssetIcon';
import { DepositSendReceiveSummary } from '@/components/deposit/DepositSendReceiveSummary';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type {
  DepositTransferChainOption,
  DepositTransferPair,
  DepositTransferTokenOption,
} from '@/hooks/useDepositConfig';
import { cn } from '@/utils';

type DepositOfflineProps = {
  tokenOptions: DepositTransferTokenOption[];
  chainOptions: DepositTransferChainOption[];
  selectedSymbol: string;
  selectedChain: string;
  currentPair: DepositTransferPair | null;
  depositAddress: string;
  settlementTarget: {
    symbol: string;
    tokenIcon: string;
    chainIcon: string;
    chainName: string;
  } | null;
  onSelectToken: (symbol: string) => void;
  onSelectChain: (chain: string) => void;
};

/**
 * Offline：线下转账充值页（挂在 {@link DepositDialog}）：选币 / 选网、二维码与嵌入式收款地址。
 *
 * 邮箱登录打开充值后直接进入本页；收款地址一律为 Privy 嵌入式托管地址。
 */
export function DepositOffline({
  tokenOptions,
  chainOptions,
  selectedSymbol,
  selectedChain,
  currentPair,
  depositAddress,
  settlementTarget,
  onSelectToken,
  onSelectChain,
}: DepositOfflineProps) {
  const { t } = useTranslation();

  const selectedTokenOption =
    tokenOptions.find(
      (item) => item.symbol.toLowerCase() === selectedSymbol.toLowerCase(),
    ) ?? tokenOptions[0];

  const selectedChainOption =
    chainOptions.find((item) => item.chain === selectedChain) ??
    chainOptions[0];

  const minDeposit = currentPair?.minDeposit || '0';
  const displaySymbol = currentPair?.symbol || selectedSymbol;
  const symbolNormalized = displaySymbol.trim().toLowerCase();
  const isUsdtSelected = symbolNormalized === 'usdt';
  const isUsdcSelected = symbolNormalized === 'usdc';
  const isSolanaSelected = currentPair?.chainType === 'svm';

  // swap-hint：仅 USDT 展示「兑换成 USDC」
  const showSwapHint = Boolean(currentPair) && isUsdtSelected;

  // min-hint：USDT 任意网；USDC 仅非 Solana；额度取 init.deposit token.min
  const showMinHint =
    Boolean(currentPair) &&
    (isUsdtSelected || (isUsdcSelected && !isSolanaSelected));

  // dw-swap-row：与 min-hint 同口径，结算目标为 Solana USDC
  const showSwapRow = showMinHint && Boolean(settlementTarget);

  async function handleCopyAddress() {
    if (!depositAddress) {
      toast.error(t('再试一次'));
      return;
    }

    try {
      await navigator.clipboard.writeText(depositAddress);
      toast.success(t('地址已复制'));
    } catch (error) {
      console.error('Failed to copy address:', error);
      toast.error(t('再试一次'));
    }
  }

  return (
    <div className={cn('flex flex-col items-center', 'gap-4')}>
      <div className={cn('flex w-full flex-col', 'gap-4')}>
        <section
          aria-label={t('币种')}
          className={cn('flex flex-col', 'gap-2')}
        >
          <h3 className={cn('text-base leading-6 font-medium text-foreground')}>
            {t('币种')}
          </h3>
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                // Layout
                'flex h-12 w-full items-center justify-between',
                // Spacing
                'gap-3 py-2 pr-2.5 pl-4',
                // Visual
                'rounded-xl border border-border bg-background text-base leading-6 text-foreground',
                // State
                'cursor-pointer outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring',
              )}
            >
              <div className="flex items-center gap-3">
                {selectedTokenOption ? (
                  <TokenAssetIcon
                    symbol={selectedTokenOption.symbol}
                    iconUrl={selectedTokenOption.icon}
                  />
                ) : null}
                <span>{selectedTokenOption?.symbol || selectedSymbol}</span>
              </div>
              <IconChevronDown className="size-6 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="w-(--anchor-width) min-w-(--anchor-width)"
            >
              {tokenOptions.map((option) => (
                <DropdownMenuItem
                  key={option.symbol}
                  className="flex items-center gap-3"
                  onClick={() => onSelectToken(option.symbol)}
                >
                  <TokenAssetIcon
                    symbol={option.symbol}
                    iconUrl={option.icon}
                  />
                  <span>{option.symbol}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </section>

        <section
          aria-label={t('网络')}
          className={cn('flex flex-col', 'gap-2')}
        >
          <h3 className={cn('text-base leading-6 font-medium text-foreground')}>
            {t('网络')}
          </h3>
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                // Layout
                'flex h-12 w-full items-center justify-between',
                // Spacing
                'gap-3 py-2 pr-2.5 pl-4',
                // Visual
                'rounded-xl border border-border bg-background text-base leading-6 text-foreground',
                // State
                'cursor-pointer outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring',
              )}
            >
              <div className="flex items-center gap-3">
                {selectedChainOption?.chainIcon ? (
                  <img
                    src={selectedChainOption.chainIcon}
                    alt={selectedChainOption.chainName}
                    className="size-8 rounded-full object-cover"
                  />
                ) : null}
                <span>
                  {selectedChainOption?.chainName || selectedChain || '—'}
                </span>
              </div>
              <IconChevronDown className="size-6 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="w-(--anchor-width) min-w-(--anchor-width)"
            >
              {chainOptions.map((option) => (
                <DropdownMenuItem
                  key={option.chain}
                  className="flex items-center gap-3"
                  onClick={() => onSelectChain(option.chain)}
                >
                  <img
                    src={option.chainIcon}
                    alt={option.chainName}
                    className="size-8 rounded-full object-cover"
                  />
                  <span>{option.chainName}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </section>
      </div>

      <div
        className={cn(
          'flex items-center justify-center',
          'p-2',
          'rounded-2xl border border-border bg-background shadow-[0px_1px_4px_rgba(0,0,0,0.08)]',
        )}
      >
        <div
          className={cn(
            'flex items-center justify-center',
            'size-40',
            'overflow-hidden rounded-2xl bg-white',
          )}
        >
          {depositAddress ? (
            <QRCodeCanvas
              value={depositAddress}
              size={160}
              level="H"
              includeMargin={false}
              bgColor="#ffffff"
              fgColor="#000000"
            />
          ) : (
            <span className="text-xs text-muted-foreground">{t('二维码')}</span>
          )}
        </div>
      </div>

      <section
        aria-label={t('充值地址')}
        className={cn('flex w-full flex-col', 'gap-2')}
      >
        <h3 className={cn('text-base leading-6 font-medium text-foreground')}>
          {t('充值地址')}
        </h3>
        <div
          className={cn(
            'flex items-center',
            'gap-4 p-3',
            'rounded-xl border border-border bg-background text-sm leading-5 text-foreground',
          )}
        >
          <span className="min-w-0 flex-1 break-all">
            {depositAddress || t('正在加载钱包地址...')}
          </span>
          <button
            type="button"
            onClick={handleCopyAddress}
            disabled={!depositAddress}
            className={cn(
              'shrink-0',
              'p-1',
              'cursor-pointer transition-opacity hover:opacity-70',
              !depositAddress && 'cursor-not-allowed opacity-50',
            )}
            aria-label={t('复制地址')}
          >
            <IconCopy className="size-6 text-foreground" />
          </button>
        </div>
      </section>

      {showSwapRow && currentPair && settlementTarget ? (
        <DepositSendReceiveSummary
          sendSymbol={currentPair.symbol}
          sendTokenIcon={currentPair.tokenIcon}
          sendChainIcon={currentPair.chainIcon}
          receiveSymbol={settlementTarget.symbol}
          receiveTokenIcon={settlementTarget.tokenIcon}
          receiveChainIcon={settlementTarget.chainIcon}
        />
      ) : null}

      <ul
        className={cn(
          'flex w-full list-disc flex-col',
          'pl-[18px]',
          'text-xs leading-4 tracking-[0.04px] text-muted-foreground',
        )}
      >
        {showSwapHint ? (
          <li>
            {t(
              '将代币发送到这个地址，它将自动在你的 StoryFun 账户中兑换成USDC',
            )}
          </li>
        ) : null}
        {showMinHint ? (
          <li>
            {t('最小充值金额：{{min}} {{token}}，低于该金额则无法到账', {
              min: minDeposit,
              token: displaySymbol,
            })}
          </li>
        ) : null}
        <li>{t('请确认转账网络，网络错误可能导致资产丢失')}</li>
      </ul>
    </div>
  );
}
