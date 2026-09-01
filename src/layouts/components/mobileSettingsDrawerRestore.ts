export type MobileSettingsDrawerSide = 'left' | 'right';
export type MobileSettingsPage = 'language' | 'settings';

const MOBILE_SETTINGS_DRAWER_RESTORE_KEY =
  'story:mobile-settings-drawer-restore';

export function requestMobileSettingsDrawerRestore(
  side: MobileSettingsDrawerSide,
  page: MobileSettingsPage,
) {
  try {
    sessionStorage.setItem(
      MOBILE_SETTINGS_DRAWER_RESTORE_KEY,
      `${side}:${page}`,
    );
  } catch {
    // 隐私模式禁用存储时仍允许正常切换主题。
  }
}

export function readMobileSettingsDrawerRestore(
  side: MobileSettingsDrawerSide,
): MobileSettingsPage | null {
  try {
    const restoreValue = sessionStorage.getItem(
      MOBILE_SETTINGS_DRAWER_RESTORE_KEY,
    );
    if (restoreValue === `${side}:language`) {
      return 'language';
    }
    if (restoreValue === `${side}:settings`) {
      return 'settings';
    }
    return null;
  } catch {
    return null;
  }
}

export function clearMobileSettingsDrawerRestore(
  side: MobileSettingsDrawerSide,
) {
  try {
    if (
      sessionStorage
        .getItem(MOBILE_SETTINGS_DRAWER_RESTORE_KEY)
        ?.startsWith(`${side}:`)
    ) {
      sessionStorage.removeItem(MOBILE_SETTINGS_DRAWER_RESTORE_KEY);
    }
  } catch {
    // 无存储权限时无需清理。
  }
}
