import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getUsdcIncomeQueryKey } from '@/api/__generated__/wallet/userwallet-income/userwallet-income';
import { ClaimEarningsDialog } from '@/components/ClaimEarningsDialog';
import { ContentContainer } from '@/components/common/ContentContainer';
import { PageTitleSection } from '@/components/common/PageTitleSection';
import {
  profileContentTabsListClassName,
  profileContentTabsWrapperClassName,
  profileContentTabTriggerClassName,
} from '@/components/common/Tabs';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { IncomeWalletEarningsStoryFilters } from '@/features/income/components/wallet-earnings/IncomeWalletEarningsStoryFilters';
import { IncomeWalletEarningsSummarySection } from '@/features/income/components/wallet-earnings/IncomeWalletEarningsSummarySection';
import { IncomeWalletEarningsTable } from '@/features/income/components/wallet-earnings/IncomeWalletEarningsTable';
import { useIncomeWalletStoryEarnings } from '@/features/income/hooks/useIncomeWalletStoryEarnings';
import { useIncomeWalletStorySettlingReward } from '@/features/income/hooks/useIncomeWalletStorySettlingReward';
import { useIncomeWalletStoryTotalReward } from '@/features/income/hooks/useIncomeWalletStoryTotalReward';
import { useIncomeWalletUsdcEarnings } from '@/features/income/hooks/useIncomeWalletUsdcEarnings';
import {
  IncomeStoryEarningsFilter,
  IncomeWalletAssetTab,
} from '@/features/income/incomeWalletEarningsFormat';
import useGlobalStore from '@/stores/global';
import { refreshWalletAssets } from '@/stores/updater';
import { cn, toNumber } from '@/utils';

export function IncomeView() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const claimableUsdcBalance = useGlobalStore(
    (state) => state.claimableUsdcBalance,
  );
  const claimableStoryBalance = useGlobalStore(
    (state) => state.claimableStoryBalance,
  );

  const [assetTab, setAssetTab] = useState<IncomeWalletAssetTab>(
    IncomeWalletAssetTab.Story,
  );
  const [storyFilter, setStoryFilter] = useState<IncomeStoryEarningsFilter>(
    IncomeStoryEarningsFilter.All,
  );
  const [claimDialogOpen, setClaimDialogOpen] = useState(false);
  const [claimAssetCode, setClaimAssetCode] = useState<'STORY' | 'USDC'>(
    'STORY',
  );

  const isStoryTab = assetTab === IncomeWalletAssetTab.Story;
  const isUsdcTab = assetTab === IncomeWalletAssetTab.Usdc;

  // 摘要区始终展示累计 USDC，故列表接口常开；明细表仍按 Tab 切页消费 rows。
  const usdcEarnings = useIncomeWalletUsdcEarnings(true);
  const storyTotalReward = useIncomeWalletStoryTotalReward(true);
  const storySettlingReward = useIncomeWalletStorySettlingReward(true);
  const storyEarnings = useIncomeWalletStoryEarnings({
    enabled: isStoryTab,
    filter: storyFilter,
  });

  const isLoading =
    (isStoryTab ? storyEarnings : usdcEarnings).isLogin &&
    (isStoryTab ? storyEarnings : usdcEarnings).isPending;

  // 领取成功后刷新中心化资产余额与 USDC 收益列表。
  const handleClaimSuccess = () => {
    void refreshWalletAssets();
    void queryClient.invalidateQueries({
      queryKey: getUsdcIncomeQueryKey(),
    });
  };

  // 打开 STORY 领取确认弹窗。
  const handleClaimStory = () => {
    setClaimAssetCode('STORY');
    setClaimDialogOpen(true);
  };

  // 打开 USDC 领取确认弹窗。
  const handleClaimUsdc = () => {
    setClaimAssetCode('USDC');
    setClaimDialogOpen(true);
  };

  const claimAmount =
    claimAssetCode === 'STORY'
      ? toNumber(claimableStoryBalance.available ?? '0')
      : toNumber(claimableUsdcBalance.available ?? '0');

  const showStoryListFooter =
    isStoryTab &&
    storyEarnings.isLogin &&
    !storyEarnings.isError &&
    storyEarnings.rows.length > 0;

  const showUsdcListFooter =
    isUsdcTab &&
    usdcEarnings.isLogin &&
    !usdcEarnings.isError &&
    usdcEarnings.rows.length > 0;

  return (
    <div
      className={cn(
        'flex min-h-0 w-full min-w-0 flex-1 flex-col',
        'bg-points-page-surface-muted',
      )}
    >
      <ContentContainer
        className={cn('flex w-full flex-col gap-4 py-6', 'md:gap-8 md:py-8')}
      >
        <PageTitleSection title={t('收益')} />

        <IncomeWalletEarningsSummarySection
          totalStoryEarnings={storyTotalReward.totalStoryEarnings}
          totalUsdcEarnings={usdcEarnings.totalUsdcEarnings}
          settlingStoryEarnings={storySettlingReward.settlingStoryEarnings}
          claimableStory={claimableStoryBalance.available}
          claimableUsdc={claimableUsdcBalance.available}
          onClaimStory={handleClaimStory}
          onClaimUsdc={handleClaimUsdc}
        />

        <Tabs
          value={assetTab}
          onValueChange={(value) => setAssetTab(value as IncomeWalletAssetTab)}
          className="flex w-full flex-col gap-3 md:gap-4"
        >
          <div className={profileContentTabsWrapperClassName}>
            <TabsList
              variant="line"
              className={cn(profileContentTabsListClassName, 'h-10 pt-0')}
            >
              <TabsTrigger
                value={IncomeWalletAssetTab.Story}
                className={cn(profileContentTabTriggerClassName, 'h-10')}
              >
                STORY
              </TabsTrigger>
              <TabsTrigger
                value={IncomeWalletAssetTab.Usdc}
                className={cn(profileContentTabTriggerClassName, 'h-10')}
              >
                USDC
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent
            value={IncomeWalletAssetTab.Story}
            className="m-0 flex flex-col gap-3 outline-none md:gap-4"
          >
            <IncomeWalletEarningsStoryFilters
              filter={storyFilter}
              onFilterChange={setStoryFilter}
            />
            <IncomeWalletEarningsTable
              rows={storyEarnings.rows}
              isLoading={isLoading}
              isError={storyEarnings.isError}
              listFooter={{
                isFetchingNextPage: storyEarnings.isFetchingNextPage,
                hasNextPage: !!storyEarnings.hasNextPage,
                visible: showStoryListFooter,
                fetchNextPage: () => {
                  void storyEarnings.fetchNextPage();
                },
              }}
            />
          </TabsContent>

          <TabsContent
            value={IncomeWalletAssetTab.Usdc}
            className="m-0 flex flex-col gap-3 outline-none md:gap-4"
          >
            <IncomeWalletEarningsTable
              rows={usdcEarnings.rows}
              isLoading={isLoading}
              isError={usdcEarnings.isError}
              listFooter={{
                isFetchingNextPage: usdcEarnings.isFetchingNextPage,
                hasNextPage: !!usdcEarnings.hasNextPage,
                visible: showUsdcListFooter,
                fetchNextPage: () => {
                  void usdcEarnings.fetchNextPage();
                },
              }}
            />
          </TabsContent>
        </Tabs>
      </ContentContainer>

      <ClaimEarningsDialog
        open={claimDialogOpen}
        onOpenChange={setClaimDialogOpen}
        amount={claimAmount}
        assetCode={claimAssetCode}
        onSuccess={handleClaimSuccess}
      />
    </div>
  );
}
