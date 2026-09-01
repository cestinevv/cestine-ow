import { ThemeProvider } from 'next-themes';
import type { ReactNode } from 'react';

interface GlobalThemeProviderProps {
  children: ReactNode;
  /** APP 法律页等场景：按 URL 强制皮肤，不写入用户主题偏好。 */
  forcedTheme?: 'light' | 'dark';
}

export default function GlobalThemeProvider({
  children,
  forcedTheme,
}: GlobalThemeProviderProps) {
  return (
    <ThemeProvider
      attribute="data-theme"
      defaultTheme="dark"
      forcedTheme={forcedTheme}
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
}
