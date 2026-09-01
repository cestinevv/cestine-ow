import '@/i18n';

import type { Story } from '@ladle/react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';

import AppLoadingContainer from './AppLoadingContainer';

export const Loading: Story = () => (
  <div className="w-full max-w-xl p-4">
    <AppLoadingContainer data={null}>
      <div className="p-4">列表内容</div>
    </AppLoadingContainer>
  </div>
);

/** `isLoading` + `data=[]`，与 Query 字段对齐的推荐写法 */
export const LoadingExplicitIsLoading: Story = () => (
  <div className="w-full max-w-xl p-4">
    <AppLoadingContainer data={[]} isLoading>
      <div className="p-4">列表内容</div>
    </AppLoadingContainer>
  </div>
);

/** `isLoading={false}` 且 `data=null` 时视为空列表（非加载） */
export const EmptyWhenNotLoadingAndDataNull: Story = () => (
  <div className="w-full max-w-xl p-4">
    <AppLoadingContainer data={null} isLoading={false}>
      <div className="p-4">列表内容</div>
    </AppLoadingContainer>
  </div>
);

export const Empty: Story = () => (
  <div className="w-full max-w-xl p-4">
    <AppLoadingContainer data={[]}>
      <div className="p-4">列表内容</div>
    </AppLoadingContainer>
  </div>
);

export const EmptyCustomDescription: Story = () => (
  <div className="w-full max-w-xl p-4">
    <AppLoadingContainer data={[]} emptyDescription="暂无短剧">
      <div className="p-4">列表内容</div>
    </AppLoadingContainer>
  </div>
);

export const ErrorStory: Story = () => (
  <div className="w-full max-w-xl p-4">
    <AppLoadingContainer data={[]} isError>
      <div className="p-4">列表内容</div>
    </AppLoadingContainer>
  </div>
);

export const AsTableStates: Story = () => (
  <div className="flex w-full max-w-2xl flex-col gap-8 p-4">
    <table className="w-full border-collapse">
      <thead>
        <tr>
          <th className="border-b px-3 py-2 text-left text-sm">列 A</th>
          <th className="border-b px-3 py-2 text-left text-sm">列 B</th>
          <th className="border-b px-3 py-2 text-left text-sm">列 C</th>
        </tr>
      </thead>
      <tbody>
        <AppLoadingContainer asTable colSpan={3} data={[]} isLoading>
          <tr>
            <td colSpan={3}>不会渲染</td>
          </tr>
        </AppLoadingContainer>
      </tbody>
    </table>
    <table className="w-full border-collapse">
      <thead>
        <tr>
          <th className="border-b px-3 py-2 text-left text-sm">列 A</th>
          <th className="border-b px-3 py-2 text-left text-sm">列 B</th>
          <th className="border-b px-3 py-2 text-left text-sm">列 C</th>
        </tr>
      </thead>
      <tbody>
        <AppLoadingContainer asTable colSpan={3} data={[]} isError>
          <tr>
            <td colSpan={3}>不会渲染</td>
          </tr>
        </AppLoadingContainer>
      </tbody>
    </table>
    <table className="w-full border-collapse">
      <thead>
        <tr>
          <th className="border-b px-3 py-2 text-left text-sm">列 A</th>
          <th className="border-b px-3 py-2 text-left text-sm">列 B</th>
          <th className="border-b px-3 py-2 text-left text-sm">列 C</th>
        </tr>
      </thead>
      <tbody>
        <AppLoadingContainer asTable colSpan={3} data={[]}>
          <tr>
            <td colSpan={3}>不会渲染</td>
          </tr>
        </AppLoadingContainer>
      </tbody>
    </table>
  </div>
);

export const WithDataScroll: Story = () => (
  <div className="w-full max-w-xl p-4">
    <AppLoadingContainer data={[1, 2, 3]}>
      <div className="h-[800px] bg-muted/40 p-4 text-sm text-muted-foreground">
        长内容区域，验证 maxHeight 下可滚动。
      </div>
    </AppLoadingContainer>
  </div>
);

export const LoadingEmptyToggle: Story = () => {
  const [data, setData] = useState<readonly number[] | null>(null);

  return (
    <div className="flex w-full max-w-xl flex-col gap-4 p-4">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setData(null);
          }}
        >
          null（加载）
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setData([]);
          }}
        >
          []（空）
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setData([1]);
          }}
        >
          有数据
        </Button>
      </div>
      <AppLoadingContainer data={data}>
        <div className="p-4">列表内容</div>
      </AppLoadingContainer>
    </div>
  );
};
