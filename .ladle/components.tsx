import type { GlobalProvider } from '@ladle/react';
import { I18nextProvider } from 'react-i18next';

import '@/app.css';
import i18n from '@/i18n';

/**
 * Ladle 全局壳：注入全站 Tailwind / CSS 变量与 i18n。
 * 未加载 app.css 时 Dialog Overlay 的 fixed / bg-black/50 等工具类全部失效，
 * 只剩 Base UI InternalBackdrop（透明 fixed inset），预览会看起来像半屏黑块。
 */
export const Provider: GlobalProvider = ({ children, globalState }) => {
  const theme = globalState.theme === 'dark' ? 'dark' : 'light';

  return (
    <I18nextProvider i18n={i18n}>
      <div data-theme={theme} className="min-h-full bg-background text-foreground">
        {children}
      </div>
    </I18nextProvider>
  );
};
