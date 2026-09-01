/** APP 法律页（/privacy、/terms）查询参数。 */
export type LegalSearch = {
  lang?: string;
  /** 皮肤：`light` / `dark`；缺省或非法值由页面侧按 light 处理。 */
  theme?: 'light' | 'dark';
};

export function parseLegalTheme(value: unknown): 'light' | 'dark' | undefined {
  if (value === 'light' || value === 'dark') {
    return value;
  }

  return undefined;
}

export function validateLegalSearch(
  search: Record<string, unknown>,
): LegalSearch {
  return {
    lang: typeof search.lang === 'string' ? search.lang : undefined,
    theme: parseLegalTheme(search.theme),
  };
}
