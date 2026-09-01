import { resolveUserFacingErrorMessage } from '@/hooks/solana/directWallet/errors';

/** 业务成功但未返回 hash：勿用 API 的 msg「Success」作 toast 文案 */
export class SponsorSubmitMissingTxHashError extends Error {
  override readonly name = 'SponsorSubmitMissingTxHashError';

  constructor() {
    super('SPONSOR_SUBMIT_MISSING_TX_HASH');
  }
}

export const SOL_INSUFFICIENT_I18N_KEY = 'SOL 余额不足，请充值后重试';

const INSUFFICIENT_SOL_BALANCE_RE =
  /^insufficient sol balance\.?\s*please add sol and try again\.?$/i;
const INSUFFICIENT_LAMPORTS_RE = /insufficient lamports/i;
const INSUFFICIENT_FUNDS_FOR_RENT_RE = /insufficient funds for rent/i;

const KNOWN_SPONSOR_ERROR_RULES: ReadonlyArray<{
  test: (message: string) => boolean;
  key: string;
}> = [
  {
    test: (message) => INSUFFICIENT_SOL_BALANCE_RE.test(message.trim()),
    key: SOL_INSUFFICIENT_I18N_KEY,
  },
  {
    test: (message) => INSUFFICIENT_LAMPORTS_RE.test(message),
    key: SOL_INSUFFICIENT_I18N_KEY,
  },
  {
    test: (message) => INSUFFICIENT_FUNDS_FOR_RENT_RE.test(message),
    key: SOL_INSUFFICIENT_I18N_KEY,
  },
  {
    test: (message) => message.trim() === SOL_INSUFFICIENT_I18N_KEY,
    key: SOL_INSUFFICIENT_I18N_KEY,
  },
];

/**
 * 将代付 / 链上已知英文或内部文案映射为中文 i18n key。
 * @param message - 用户可见错误原文
 * @returns 命中时返回 i18n key，否则 undefined
 */
export function mapKnownSponsorErrorMessageToI18nKey(
  message: string,
): string | undefined {
  return KNOWN_SPONSOR_ERROR_RULES.find((rule) => rule.test(message))?.key;
}

export function getSponsorSubmitErrorMessage(
  error: unknown,
  t: (key: string) => string,
  fallbackKey: string,
): string {
  if (error instanceof SponsorSubmitMissingTxHashError) {
    return t(
      '代付提交成功但未返回交易哈希，暂无法确认上链状态，请稍后刷新或联系客服',
    );
  }

  const raw = resolveUserFacingErrorMessage(
    error,
    t(fallbackKey),
    t('用户拒绝了该请求'),
  );
  const mappedKey = mapKnownSponsorErrorMessageToI18nKey(raw);

  if (mappedKey) {
    return t(mappedKey);
  }

  return raw;
}
