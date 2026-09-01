import { cn } from '@/utils';

const DEFAULT_TOKEN_ICON_CLASS = 'size-8 shrink-0';

type TokenAssetIconProps = {
  symbol: string;
  iconUrl?: string;
  className?: string;
};

/** 代币图标：统一使用配置项 icon URL。 */
export function TokenAssetIcon({
  symbol,
  iconUrl,
  className,
}: TokenAssetIconProps) {
  const iconClassName = cn(
    DEFAULT_TOKEN_ICON_CLASS,
    'rounded-full object-cover',
    className,
  );

  if (iconUrl) {
    return <img src={iconUrl} alt={symbol} className={iconClassName} />;
  }

  return (
    <div
      className={cn(
        DEFAULT_TOKEN_ICON_CLASS,
        'rounded-full bg-muted',
        className,
      )}
    />
  );
}
