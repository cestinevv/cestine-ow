import {
  UsdcIncomeLedgerItemBizType,
  type UsdcIncomeLedgerItemBizType as UsdcIncomeLedgerItemBizTypeValue,
} from '@/api/__generated__/wallet/model/usdcIncomeLedgerItemBizType';

/** dashboard ledger bizType → i18n key（与 OpenAPI 枚举注释一致） */
const DASHBOARD_LEDGER_BIZ_TYPE_KEY: Record<
  UsdcIncomeLedgerItemBizTypeValue,
  string
> = {
  [UsdcIncomeLedgerItemBizType.NUMBER_2101]: '签约费',
  [UsdcIncomeLedgerItemBizType.NUMBER_2103]: '人工加款',
  [UsdcIncomeLedgerItemBizType.NUMBER_2104]: '人工扣款',
  [UsdcIncomeLedgerItemBizType.NUMBER_2106]: '购买体力费',
  [UsdcIncomeLedgerItemBizType.NUMBER_2107]: '合成升级费',
  [UsdcIncomeLedgerItemBizType.NUMBER_2108]: '手续费',
};

export function getDashboardLedgerBizTypeKey(
  bizType?: UsdcIncomeLedgerItemBizTypeValue | number,
): string {
  if (bizType === undefined || bizType === null) {
    return '-';
  }

  return (
    DASHBOARD_LEDGER_BIZ_TYPE_KEY[
      bizType as UsdcIncomeLedgerItemBizTypeValue
    ] ?? String(bizType)
  );
}
