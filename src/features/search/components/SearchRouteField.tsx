import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { SearchField } from '@/features/search/components/SearchField';
import { getSearchResultQueryKey } from '@/features/search/searchResultQueryKey';
import {
  isSearchKeywordValid,
  normalizeSearchKeyword,
  SEARCH_KEYWORD_VALIDATION_TOAST_ID,
  type SearchTab,
} from '@/features/search/searchTypes';

type SearchRouteFieldProps = {
  query?: string;
  tab: SearchTab;
  variant: 'mobile' | 'toolbar';
  autoFocus?: boolean;
};

export function SearchRouteField({
  query,
  tab,
  variant,
  autoFocus = false,
}: SearchRouteFieldProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation();
  const [draft, setDraft] = useState(query ?? '');

  useEffect(() => {
    setDraft(query ?? '');
  }, [query]);

  const handleSearch = (historyKeyword?: string) => {
    const keyword = normalizeSearchKeyword(historyKeyword ?? draft);
    if (!isSearchKeywordValid(keyword)) {
      toast.info(t('请输入 2～50 个字符'), {
        id: SEARCH_KEYWORD_VALIDATION_TOAST_ID,
      });
      return;
    }

    setDraft(keyword);
    if (normalizeSearchKeyword(query ?? '') === keyword) {
      void queryClient.resetQueries({
        queryKey: getSearchResultQueryKey(keyword, tab, i18n.language),
        exact: true,
      });
      return;
    }

    void navigate({
      to: '/search',
      search: { q: keyword, type: tab },
      replace: true,
    });
  };

  const handleClear = () => {
    setDraft('');
  };

  const handleDraftChange = (value: string) => {
    setDraft(value);
  };

  return (
    <SearchField
      value={draft}
      variant={variant}
      autoFocus={autoFocus}
      validationVisible={false}
      onChange={handleDraftChange}
      onSubmit={handleSearch}
      onClear={handleClear}
    />
  );
}
