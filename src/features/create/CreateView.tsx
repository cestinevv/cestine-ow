import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import {
  createSession,
  isExpired,
} from '@/api/__generated__/story/create-common/create-common';
import type { CreateUploadSessionResponse } from '@/api/__generated__/story/model/createUploadSessionResponse';
import { ContentContainer } from '@/components/common/ContentContainer';
import { PageTitleSection } from '@/components/common/PageTitleSection';
import { CREATE_DRAFT_SYNC_TOAST_ID } from '@/features/create/createDraftSyncToastId';
import { hasCreateDramaDraftContent } from '@/features/create/hasCreateDramaDraftContent';
import { extractStoryInnerData } from '@/features/create-actor/uploadCreatorActorAvatar';
import { DramaFlowBasicInfoStep } from '@/features/drama-flow/components/DramaFlowBasicInfoStep';
import { DramaFlowDramaClearDraftConfirmDialog } from '@/features/drama-flow/components/DramaFlowDramaClearDraftConfirmDialog';
import { DramaFlowDramaDraftSyncToast } from '@/features/drama-flow/components/DramaFlowDramaDraftSyncToast';
import { DramaFlowEpisodeStep } from '@/features/drama-flow/components/DramaFlowEpisodeStep';
import { DramaFlowRoleStep } from '@/features/drama-flow/components/DramaFlowRoleStep';
import { DramaFlowConfigContext } from '@/features/drama-flow/contexts/DramaFlowConfigContext';
import { DramaFlowContext } from '@/features/drama-flow/contexts/DramaFlowContext';
import type { DramaFlowStep } from '@/features/drama-flow/types/dramaFlowStore';
import { isObjectKeyMatchedUploadSession } from '@/features/drama-flow/utils/uploadDramaFlowFile';
import { useCreateDramaStore } from '@/stores/createDramaStore';
import { cn, SHOW_DEV_ONLY_UI } from '@/utils';

export type CreateFlowStep = DramaFlowStep;

/** 校验或创建 upload session；清空草稿后需再次调用以拿到新 session。 */
async function ensureCreateUploadSession() {
  const currentSessionId =
    useCreateDramaStore.getState().document.uploadSessionId;

  if (currentSessionId) {
    try {
      const res = await isExpired(currentSessionId);
      const isSessionExpired = extractStoryInnerData<boolean>(res);

      if (isSessionExpired) {
        const currentDocument = useCreateDramaStore.getState().document;
        useCreateDramaStore.getState().patchDocument({
          uploadSessionId: undefined,
          coverObjectKey: undefined,
          bannerObjectKey: undefined,
          episodes: currentDocument.episodes?.map((ep) => ({
            ...ep,
            videoObjectKey: undefined,
            localFileName: undefined,
            localFileSizeBytes: undefined,
            localVideoWidth: undefined,
            localVideoHeight: undefined,
          })),
        });

        const sessionRes = await createSession();
        const sessionPayload =
          extractStoryInnerData<CreateUploadSessionResponse>(sessionRes);
        if (sessionPayload?.uploadSessionId) {
          useCreateDramaStore.getState().patchDocument({
            uploadSessionId: sessionPayload.uploadSessionId,
          });
        }

        return;
      }

      const currentDocument = useCreateDramaStore.getState().document;
      const hasInvalidCoverKey =
        !!currentDocument.coverObjectKey &&
        !isObjectKeyMatchedUploadSession(
          currentDocument.coverObjectKey,
          currentSessionId,
        );
      const hasInvalidEpisodeObjectKey = (currentDocument.episodes ?? []).some(
        (episode) =>
          !!episode.videoObjectKey &&
          !isObjectKeyMatchedUploadSession(
            episode.videoObjectKey,
            currentSessionId,
          ),
      );

      if (hasInvalidCoverKey || hasInvalidEpisodeObjectKey) {
        useCreateDramaStore.getState().patchDocument({
          coverObjectKey: hasInvalidCoverKey
            ? undefined
            : currentDocument.coverObjectKey,
          bannerObjectKey: hasInvalidCoverKey
            ? undefined
            : currentDocument.bannerObjectKey,
          episodes: hasInvalidEpisodeObjectKey
            ? currentDocument.episodes?.map((episode) => ({
                ...episode,
                videoObjectKey: isObjectKeyMatchedUploadSession(
                  episode.videoObjectKey,
                  currentSessionId,
                )
                  ? episode.videoObjectKey
                  : undefined,
                localFileName: isObjectKeyMatchedUploadSession(
                  episode.videoObjectKey,
                  currentSessionId,
                )
                  ? episode.localFileName
                  : undefined,
                localFileSizeBytes: isObjectKeyMatchedUploadSession(
                  episode.videoObjectKey,
                  currentSessionId,
                )
                  ? episode.localFileSizeBytes
                  : undefined,
                localVideoWidth: isObjectKeyMatchedUploadSession(
                  episode.videoObjectKey,
                  currentSessionId,
                )
                  ? episode.localVideoWidth
                  : undefined,
                localVideoHeight: isObjectKeyMatchedUploadSession(
                  episode.videoObjectKey,
                  currentSessionId,
                )
                  ? episode.localVideoHeight
                  : undefined,
              }))
            : currentDocument.episodes,
        });
      }
    } catch (error) {
      console.error('Failed to validate upload session:', error);
    }

    return;
  }

  try {
    const sessionRes = await createSession();
    const sessionPayload =
      extractStoryInnerData<CreateUploadSessionResponse>(sessionRes);
    if (sessionPayload?.uploadSessionId) {
      useCreateDramaStore.getState().patchDocument({
        uploadSessionId: sessionPayload.uploadSessionId,
      });
    }
  } catch (error) {
    console.error('Failed to create upload session:', error);
  }
}

export function CreateView() {
  const { t } = useTranslation();
  const [clearDialogOpen, setClearDialogOpen] = useState(false);

  const hasHydrated = useCreateDramaStore((s) => s.hasHydrated);
  const draftEpoch = useCreateDramaStore((s) => s.draftEpoch);
  const currentStep = useCreateDramaStore((s) => s.flowStep);
  const setCurrentStep = useCreateDramaStore((s) => s.setFlowStep);

  useEffect(() => {
    if (!SHOW_DEV_ONLY_UI && currentStep === 3) {
      setCurrentStep(2);
    }
  }, [currentStep, setCurrentStep]);

  const hasShownDraftSyncToastRef = useRef(false);
  const hasValidatedSessionRef = useRef(false);

  // 客户端挂载时触发 persist 水合，完成后标记 hasHydrated，供各步骤从 localStorage 回显草稿。
  useEffect(() => {
    const markHydrated = () => {
      useCreateDramaStore.setState({ hasHydrated: true });
    };

    if (useCreateDramaStore.persist.hasHydrated()) {
      markHydrated();

      return;
    }

    const unsubFinish =
      useCreateDramaStore.persist.onFinishHydration(markHydrated);
    void useCreateDramaStore.persist.rehydrate();

    return () => {
      unsubFinish();
    };
  }, []);

  // 验证 uploadSessionId 是否过期，如果过期则清理多媒体草稿并重新获取 session
  useEffect(() => {
    if (!hasHydrated || hasValidatedSessionRef.current) {
      return;
    }

    hasValidatedSessionRef.current = true;
    ensureCreateUploadSession();
  }, [hasHydrated]);

  // 进入 /create 或刷新后，水合完成时仅评估一次；不因后续保存草稿等 document 变更重复弹出。
  useEffect(() => {
    if (!hasHydrated || hasShownDraftSyncToastRef.current) {
      return;
    }

    hasShownDraftSyncToastRef.current = true;

    const doc = useCreateDramaStore.getState().document;
    if (!hasCreateDramaDraftContent(doc)) {
      return;
    }

    // 用户点击 Toast「清除数据」：立即关闭 Toast 并打开清空确认弹窗。
    const handleOpenClearDraftDialog = () => {
      toast.dismiss(CREATE_DRAFT_SYNC_TOAST_ID);
      setClearDialogOpen(true);
    };

    toast.custom(
      () => (
        <DramaFlowDramaDraftSyncToast
          message={t('已同步草稿数据')}
          clearLabel={t('清除数据')}
          onClearClick={handleOpenClearDraftDialog}
        />
      ),
      {
        id: CREATE_DRAFT_SYNC_TOAST_ID,
        duration: 5000,
        unstyled: true,
        // 去掉 Sonner 外壳底色，避免深色下仍露出白底
        className: 'border-transparent bg-transparent p-0 shadow-none',
      },
    );
  }, [hasHydrated, t]);

  // 用户在确认弹窗点击「确定」：清空 persist 草稿、回到第一步并 remount 各步骤表单。
  const handleConfirmClearDraft = () => {
    useCreateDramaStore.getState().resetAll();
    ensureCreateUploadSession();
  };

  const stepKey = String(draftEpoch);

  return (
    <DramaFlowConfigContext.Provider value={{ mode: 'create' }}>
      <DramaFlowContext.Provider value={useCreateDramaStore}>
        <main
          className={cn(
            'flex min-h-0 w-full min-w-0 flex-1 flex-col',
            'bg-create-flow-page-bg',
          )}
        >
          <ContentContainer
            className={cn(
              'flex w-full flex-col gap-6 py-6 max-md:px-4',
              'md:gap-6 md:py-8',
            )}
          >
            <div className={cn('flex w-full flex-col gap-6', 'md:gap-6')}>
              <PageTitleSection title={t('发布新短剧')} />
              {currentStep === 1 ? (
                <DramaFlowBasicInfoStep
                  key={stepKey}
                  onGoToStep={setCurrentStep}
                />
              ) : currentStep === 2 ? (
                <DramaFlowEpisodeStep
                  key={stepKey}
                  onGoToStep={setCurrentStep}
                />
              ) : SHOW_DEV_ONLY_UI ? (
                <DramaFlowRoleStep key={stepKey} onGoToStep={setCurrentStep} />
              ) : null}
            </div>
          </ContentContainer>

          <DramaFlowDramaClearDraftConfirmDialog
            open={clearDialogOpen}
            onOpenChange={setClearDialogOpen}
            onConfirm={handleConfirmClearDraft}
          />
        </main>
      </DramaFlowContext.Provider>
    </DramaFlowConfigContext.Provider>
  );
}
