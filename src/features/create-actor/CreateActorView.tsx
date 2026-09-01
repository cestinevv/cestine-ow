/**
 * 创建角色 — 页面壳层：版心、标题与表单卡片（Figma 2212:6624）。
 */
import { getRouteApi } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { ContentContainer } from '@/components/common/ContentContainer';
import { PageTitleSection } from '@/components/common/PageTitleSection';
import { cn } from '@/utils';

import { CreateActorForm } from './CreateActorForm';

const createActorRoute = getRouteApi('/narrator/create-actor');

export function CreateActorView() {
  const { t } = useTranslation();
  const { actorId } = createActorRoute.useSearch();
  const isEditMode = actorId !== undefined;

  return (
    <main
      className={cn(
        'flex min-h-0 w-full min-w-0 flex-1 flex-col',
        'bg-points-page-surface-muted',
      )}
    >
      <ContentContainer
        className={cn(
          'flex w-full flex-col gap-6 py-6 max-md:px-4',
          'md:gap-6 md:py-8',
        )}
      >
        <div className={cn('flex w-full flex-col gap-6', 'md:gap-6')}>
          <PageTitleSection
            title={t(isEditMode ? '编辑角色' : '发行角色 IP')}
          />

          <CreateActorForm actorId={actorId} />
        </div>
      </ContentContainer>
    </main>
  );
}
