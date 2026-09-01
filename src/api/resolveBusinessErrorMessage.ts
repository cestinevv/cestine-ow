import i18n from '@/i18n';

/** 后端业务码 → i18n key（须含中文） */
const BUSINESS_ERROR_CODE_I18N_KEY: Record<number, string> = {
  110008: '邀请码无效',
  110045: '该账号已绑定邀请码',
  110206: '分享链接无效或与平台不匹配',
  121018: '剧集转码未完成',
  140003: '体力已耗尽，补充体力后可演出',
};

export function resolveBusinessErrorMessage(
  code: number,
  fallbackMsg: string,
): string {
  const key = BUSINESS_ERROR_CODE_I18N_KEY[code];

  if (key) {
    return i18n.t(key);
  }

  return fallbackMsg;
}
