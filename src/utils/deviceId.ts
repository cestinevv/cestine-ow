import store2 from 'store2';

const DEVICE_ID_STORAGE_KEY = 'onestory-device-id-v1';

function createDeviceId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `dev-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/** 播放上报用设备号：持久化 UUID，经 `Device-ID` header 传给 play / complete 接口 */
export function getDeviceId() {
  const existing = store2.get(DEVICE_ID_STORAGE_KEY);
  if (typeof existing === 'string' && existing.trim().length > 0) {
    return existing.trim();
  }

  const next = createDeviceId();
  store2.set(DEVICE_ID_STORAGE_KEY, next);
  return next;
}
