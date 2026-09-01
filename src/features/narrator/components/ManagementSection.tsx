/**
 * 叙述者中心 — 管理区 Tab 容器。
 * 备注：承载「短剧管理」「短剧 NFT」两个子面板的切换与渲染。
 * 当前激活页签以 URL search param `?tab=...` 为唯一事实来源，支持深链与外部跳转直接选中。
 */
import { getRouteApi } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { CommonTabs } from '@/components/common/Tabs';

import {
  NARRATOR_MANAGEMENT_TABS,
  NarratorManagementTab,
  type NarratorManagementTabValue,
} from '../constants/narratorManagementTabs';
import { DramaManagementPanel } from './DramaManagementPanel';
import { DramaNftPanel } from './DramaNftPanel';

const narratorRoute = getRouteApi('/narrator');

export function ManagementSection() {
  const { t } = useTranslation();
  const { tab } = narratorRoute.useSearch();
  const navigate = narratorRoute.useNavigate();

  const currentTab: NarratorManagementTabValue =
    tab ?? NarratorManagementTab.Drama;

  // 用户点击页签：同步写回 URL search.tab，保持单一事实来源并支持浏览器前进/后退。
  const handleTabChange = (next: string) => {
    void navigate({
      search: (prev) => ({
        ...prev,
        tab: next as NarratorManagementTabValue,
      }),
      replace: true,
      resetScroll: false, // 防止切换 tab 时页面滚动到顶部
    });
  };

  return (
    <section className="flex w-full flex-col gap-4 pb-8 md:gap-5 md:pb-10">
      <CommonTabs
        items={NARRATOR_MANAGEMENT_TABS}
        value={currentTab}
        onValueChange={handleTabChange}
        t={t}
      />

      {currentTab === NarratorManagementTab.Drama && <DramaManagementPanel />}
      {currentTab === NarratorManagementTab.DramaNft && <DramaNftPanel />}
    </section>
  );
}
