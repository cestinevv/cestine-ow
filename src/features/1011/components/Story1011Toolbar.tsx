import { useTranslation } from 'react-i18next';

import { ContentContainer } from '@/components/common/ContentContainer';
import useGlobalStore from '@/stores/global';
import { cn } from '@/utils';
import { formatNumber } from '@/utils/formatNumber';

import { story1011Media } from '../constants/story1011Media';
import { Story1011TwitterBindButton } from './Story1011TwitterBindButton';

type Story1011ToolbarProps = {
  totalPoints: number | undefined;
};

export function Story1011Toolbar({ totalPoints }: Story1011ToolbarProps) {
  const { t } = useTranslation();
  const isLogin = useGlobalStore((state) => state.isLogin);

  return (
    <header
      className={cn(
        // Layout & Positioning
        'w-full',
        // Visuals & Typography
        'bg-story-checkin-toolbar backdrop-blur-[10px]',
      )}
    >
      {/* 固定 h-15：与已登录右侧 h-11 按钮 + 垂直居中对齐，避免登录态切换高度抖动 */}
      <ContentContainer className="flex h-15 items-center justify-between gap-6">
        <h1
          className={cn(
            'm-0 text-[26px] leading-8 font-bold tracking-[-0.1px] lg:text-[30px] lg:leading-9',
            'onestory-text-gradient',
          )}
        >
          {t('诺亚方舟')}
        </h1>

        {isLogin ? (
          <div className="flex items-center gap-3">
            <div
              className={cn(
                // Layout & Positioning
                'flex h-11 items-center justify-center gap-2',
                // Sizing & Spacing
                'rounded-lg px-4',
                // Visuals & Typography
                'bg-story-checkin-control',
              )}
            >
              <img
                src={story1011Media.pointsCoin}
                alt=""
                width={24}
                height={24}
                className="size-6 object-cover"
              />
              <span className="text-sm leading-5 font-bold text-story-checkin-points">
                {/* 未拿到积分时按产品约定展示 0，避免工具栏出现占位横杠 */}
                {formatNumber(totalPoints ?? 0)}
              </span>
            </div>

            <Story1011TwitterBindButton variant="toolbar" />
          </div>
        ) : null}
      </ContentContainer>
    </header>
  );
}
