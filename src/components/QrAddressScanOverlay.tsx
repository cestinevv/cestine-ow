import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import IconX from '@/assets/svg/IconX';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils';
import { parseSolanaAddressFromQr } from '@/utils/parseSolanaAddressFromQr';

const QR_READER_ELEMENT_ID = 'qr-address-scan-reader';

type QrAddressScanOverlayProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScanSuccess: (address: string) => void;
};

export function QrAddressScanOverlay({
  open,
  onOpenChange,
  onScanSuccess,
}: QrAddressScanOverlayProps) {
  const { t } = useTranslation();
  const scannerRef = useRef<import('html5-qrcode').Html5Qrcode | null>(null);
  const hasHandledScanRef = useRef(false);
  const onScanSuccessRef = useRef(onScanSuccess);
  const onOpenChangeRef = useRef(onOpenChange);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  onScanSuccessRef.current = onScanSuccess;
  onOpenChangeRef.current = onOpenChange;

  useEffect(() => {
    const stopScanner = async () => {
      const scanner = scannerRef.current;
      if (!scanner) {
        return;
      }

      try {
        if (scanner.isScanning) {
          await scanner.stop();
        }
        scanner.clear();
      } catch {
        // 清理阶段忽略 stop/clear 异常
      }

      scannerRef.current = null;
    };

    if (!open) {
      void stopScanner();
      hasHandledScanRef.current = false;
      setErrorMessage(null);
      return;
    }

    let cancelled = false;

    const startScanner = async () => {
      if (
        typeof window === 'undefined' ||
        !window.isSecureContext ||
        !navigator.mediaDevices?.getUserMedia
      ) {
        const message = t('当前环境不支持相机扫码');
        setErrorMessage(message);
        toast.error(message);
        return;
      }

      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (cancelled) {
          return;
        }

        const scanner = new Html5Qrcode(QR_READER_ELEMENT_ID);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 240, height: 240 },
            aspectRatio: 1,
          },
          (decodedText) => {
            if (hasHandledScanRef.current) {
              return;
            }

            const address = parseSolanaAddressFromQr(decodedText);
            if (!address) {
              toast.error(t('未识别到有效的 Solana 地址'));
              return;
            }

            hasHandledScanRef.current = true;
            onScanSuccessRef.current(address);
            onOpenChangeRef.current(false);
          },
          () => {},
        );
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error('Failed to start QR scanner:', error);
        const message = t('无法访问相机，请检查浏览器权限或使用 HTTPS 访问');
        setErrorMessage(message);
        toast.error(message);
      }
    };

    void startScanner();

    return () => {
      cancelled = true;
      void stopScanner();
    };
  }, [open, t]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const handleClose = () => {
    onOpenChange(false);
  };

  if (!open) {
    return null;
  }

  return (
    <div
      className={cn('fixed inset-0 z-60', 'flex flex-col', 'bg-black')}
      role="dialog"
      aria-modal="true"
      aria-label={t('扫码填写地址')}
    >
      <header
        className={cn(
          'relative z-10 flex shrink-0 items-center justify-between',
          'gap-4 px-4 py-4',
          'bg-black/80 text-white',
        )}
      >
        <h2 className="min-w-0 flex-1 text-base leading-6 font-bold">
          {t('扫码填写地址')}
        </h2>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleClose}
          className={cn(
            'shrink-0 rounded-full text-white',
            'hover:bg-white/10 hover:text-white',
          )}
          aria-label={t('关闭')}
        >
          <IconX className="size-6" />
        </Button>
      </header>

      <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center px-4">
        <div
          className={cn(
            'relative size-60 max-w-full overflow-hidden rounded-2xl',
          )}
        >
          <div
            id={QR_READER_ELEMENT_ID}
            className={cn('size-full [&_video]:object-cover')}
          />

          <div
            aria-hidden
            className={cn(
              'pointer-events-none absolute inset-0',
              'rounded-2xl border-2 border-white/80',
            )}
          />
        </div>

        {errorMessage ? (
          <p className="mt-4 px-2 text-center text-sm leading-5 text-white/80">
            {errorMessage}
          </p>
        ) : (
          <p className="mt-4 px-2 text-center text-sm leading-5 text-white/80">
            {t('将钱包地址二维码放入框内')}
          </p>
        )}
      </div>
    </div>
  );
}
