export enum NarratorManagementTab {
  Drama = 'drama',
  DramaNft = 'drama-nft',
}

export enum NarratorReviewFilter {
  All = 'all',
  Approved = 'approved',
  Pending = 'pending',
  Rejected = 'rejected',
  Offline = 'offline',
}

export const NARRATOR_MANAGEMENT_TABS = [
  { value: NarratorManagementTab.Drama, labelKey: '短剧管理' },
  { value: NarratorManagementTab.DramaNft, labelKey: '短剧NFT' },
] as const;

export type NarratorManagementTabValue = NarratorManagementTab;

export const NARRATOR_REVIEW_FILTERS = [
  { value: NarratorReviewFilter.All, labelKey: '全部' },
  { value: NarratorReviewFilter.Approved, labelKey: '已通过' },
  { value: NarratorReviewFilter.Pending, labelKey: '审核中' },
  { value: NarratorReviewFilter.Rejected, labelKey: '未通过' },
  { value: NarratorReviewFilter.Offline, labelKey: '已下架' },
] as const;
