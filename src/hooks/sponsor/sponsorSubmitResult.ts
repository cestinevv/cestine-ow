import { appAxiosInstance } from '@/api/appRequest';

export {
  getSponsorSubmitErrorMessage,
  mapKnownSponsorErrorMessageToI18nKey,
  SOL_INSUFFICIENT_I18N_KEY,
  SponsorSubmitMissingTxHashError,
} from './sponsorSubmitErrorMessage';

/**
 * 代付（sponsor）接口新协议统一响应形态。
 *
 * - `code`：业务码，成功统一为 `100000`。
 * - `data`：业务成功时直接是链上交易 hash 字符串（base58 Signature），失败时可为 undefined。
 * - `msg`：失败时的错误文案；成功时常为 "Success"。
 *
 * 旧协议中 `data: { hash }` 的对象形态、以及 `message` 字段已废弃；
 * drama / unlock / actor NFT / withdraw 等路径迁移完毕后，统一使用本类型。
 */
export type SponsorSubmitResult = {
  code: number;
  data?: string;
  msg?: string;
};

/** 提交 partially signed tx 到 init.deposit.api，返回链上签名 */
export async function submitSponsorTransaction(
  sponsorUrl: string,
  signedTransactionBase64: string,
  errorMessage = 'Sponsor request failed',
): Promise<string> {
  const submitResponse = await appAxiosInstance<{
    data: SponsorSubmitResult;
  }>(sponsorUrl, {
    method: 'POST',
    body: JSON.stringify({ transaction: signedTransactionBase64 }),
  });
  const submitResult = submitResponse.data;

  const isSuccess = submitResult.code === 100000;
  const txHash = submitResult.data?.trim();

  if (!isSuccess || !txHash) {
    throw new Error(submitResult.msg || errorMessage);
  }

  return txHash;
}
