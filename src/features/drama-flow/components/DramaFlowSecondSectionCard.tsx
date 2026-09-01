import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/utils';

type CreateSecondSectionCardProps = {
  children: ReactNode;
};

export function DramaFlowSecondSectionCard({
  children,
}: CreateSecondSectionCardProps) {
  const { t } = useTranslation();

  return (
    <div className={cn('flex w-full flex-col', 'gap-6')}>
      <p className={cn('text-sm leading-5 font-normal text-muted-foreground')}>
        {t(
          '批量上传视频文件，系统将自动按文件名排序生成剧集列表。支持拖拽排序、删除、编辑标题等操作。',
        )}
      </p>
      {children}
    </div>
  );
}
