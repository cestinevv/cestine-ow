import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { createStore, useStore } from 'zustand';
import type { DramaEditSessionResponse as DramaEditContextResponse } from '@/api/__generated__/story/model/dramaEditSessionResponse';
import { AppBusinessError } from '@/api/appRequest';
import AppLoadingContainer from '@/components/common/AppLoadingContainer';
import { ContentContainer } from '@/components/common/ContentContainer';
import { PageTitleSection } from '@/components/common/PageTitleSection';
import { extractStoryInnerData } from '@/features/create-actor/uploadCreatorActorAvatar';
import { DramaFlowBasicInfoStep } from '@/features/drama-flow/components/DramaFlowBasicInfoStep';
import { DramaFlowEpisodeStep } from '@/features/drama-flow/components/DramaFlowEpisodeStep';
import { DramaFlowRoleStep } from '@/features/drama-flow/components/DramaFlowRoleStep';
import { DramaFlowConfigContext } from '@/features/drama-flow/contexts/DramaFlowConfigContext';
import { DramaFlowContext } from '@/features/drama-flow/contexts/DramaFlowContext';
import type { DramaFlowStoreState } from '@/features/drama-flow/types/dramaFlowStore';
import { cloneDramaFlowDocument } from '@/features/edit/cloneDramaFlowDocument';
import {
  EDIT_CONTEXT_FATAL_ERROR_CODES,
  getCreatorEditContext,
  getCreatorEditContextQueryKey,
} from '@/features/edit/editDramaApi';
import { mapEditContextToDramaFlowDocument } from '@/features/edit/mapEditContext';
import { cn, SHOW_DEV_ONLY_UI } from '@/utils';
import { readSnowflakeId } from '@/utils/snowflakeId';

const EDIT_FATAL_REDIRECT_DELAY_MS = 3000;
const EDIT_FATAL_TOAST_ID = 'edit-context-fatal';

function isEditContextFatalError(error: unknown): error is AppBusinessError {
  return (
    error instanceof AppBusinessError &&
    (EDIT_CONTEXT_FATAL_ERROR_CODES as readonly number[]).includes(error.code)
  );
}

function createEditStore(initialData: DramaEditContextResponse) {
  const initialDocument = mapEditContextToDramaFlowDocument(initialData);

  return createStore<DramaFlowStoreState>((set) => ({
    document: initialDocument,
    flowStep: 1,
    hasHydrated: true,
    isSubmitting: false,
    submitError: null,

    patchDocument: (partial) => {
      set((s) => ({
        document: {
          ...s.document,
          ...partial,
          episodes:
            'episodes' in partial ? partial.episodes : s.document.episodes,
          roles: 'roles' in partial ? partial.roles : s.document.roles,
          tagIds: 'tagIds' in partial ? partial.tagIds : s.document.tagIds,
        },
      }));
    },
    replaceEpisodes: (episodes) => {
      set((s) => ({ document: { ...s.document, episodes } }));
    },
    replaceRoles: (roles) => {
      set((s) => ({ document: { ...s.document, roles } }));
    },
    setFlowStep: (step) => {
      set({ flowStep: step });
    },
    resetAll: () => {
      set({
        document: mapEditContextToDramaFlowDocument(initialData),
        flowStep: 1,
        isSubmitting: false,
        submitError: null,
      });
    },
    setSubmitting: (value) => {
      set({ isSubmitting: value });
    },
    setSubmitError: (value) => {
      set({ submitError: value });
    },
  }));
}

export function EditView() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const searchParams = useSearch({ strict: false }) as { dramaId?: string };
  const dramaIdText = readSnowflakeId(searchParams.dramaId);
  const shownFatalToastKeyRef = useRef<string | null>(null);

  const {
    data: editContextResponse,
    isLoading,
    isFetching,
    isError,
    error,
  } = useQuery({
    queryKey: dramaIdText
      ? getCreatorEditContextQueryKey(dramaIdText)
      : ['edit-context-disabled'],
    queryFn: ({ signal }) => {
      if (!dramaIdText) {
        throw new Error('Missing dramaId');
      }

      return getCreatorEditContext(dramaIdText, { signal });
    },
    enabled: Boolean(dramaIdText),
    retry: (_, queryError) => !isEditContextFatalError(queryError),
    // 编辑页 store 仅在首屏初始化；窗口聚焦默认 refetch 会换响应引用并重建 store，导致 flowStep 回到 1。
    refetchOnWindowFocus: false,
    refetchOnMount: 'always',
  });

  useEffect(() => {
    let fatalMessage: string | undefined;
    let fatalToastKey: string | undefined;

    if (!dramaIdText) {
      fatalMessage = t('缺少短剧 ID');
      fatalToastKey = 'missing-drama-id';
    } else if (isEditContextFatalError(error)) {
      fatalMessage = error.message;
      fatalToastKey = `${dramaIdText}:${error.code}`;
    }

    if (!fatalMessage || !fatalToastKey) {
      return;
    }

    // Toast 仅展示一次；跳转 timer 仍随 effect 重建，兼容 Strict Mode cleanup。
    if (shownFatalToastKeyRef.current !== fatalToastKey) {
      shownFatalToastKeyRef.current = fatalToastKey;
      toast.error(fatalMessage, {
        id: EDIT_FATAL_TOAST_ID,
        duration: EDIT_FATAL_REDIRECT_DELAY_MS,
      });
    }

    const timer = window.setTimeout(() => {
      void navigate({ to: '/creation-management', replace: true });
    }, EDIT_FATAL_REDIRECT_DELAY_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [dramaIdText, error, navigate, t]);

  const editContextPayload = useMemo(() => {
    if (!editContextResponse) {
      return undefined;
    }

    return extractStoryInnerData<DramaEditContextResponse>(editContextResponse);
  }, [editContextResponse]);

  const storeRef = useRef<ReturnType<typeof createEditStore> | null>(null);
  const baselineDocumentRef = useRef<ReturnType<
    typeof cloneDramaFlowDocument
  > | null>(null);
  const initializedDramaIdRef = useRef<string | null>(null);

  if (
    editContextPayload &&
    dramaIdText &&
    !isFetching &&
    initializedDramaIdRef.current !== dramaIdText
  ) {
    storeRef.current = createEditStore(editContextPayload);
    baselineDocumentRef.current = cloneDramaFlowDocument(
      mapEditContextToDramaFlowDocument(editContextPayload),
    );
    initializedDramaIdRef.current = dramaIdText;
  }

  const hasInitializedCurrentDrama =
    initializedDramaIdRef.current === dramaIdText;
  const store = hasInitializedCurrentDrama ? storeRef.current : null;
  const baselineDocument = hasInitializedCurrentDrama
    ? baselineDocumentRef.current
    : null;

  if (!dramaIdText) {
    return (
      <AppLoadingContainer data={[]} isError minHeight={280}>
        {null}
      </AppLoadingContainer>
    );
  }

  if (isLoading || (!store && isFetching)) {
    return (
      <AppLoadingContainer data={[]} isLoading minHeight={280}>
        {null}
      </AppLoadingContainer>
    );
  }

  if (isError || !editContextPayload || !store || !baselineDocument) {
    return (
      <AppLoadingContainer data={[]} isError minHeight={280}>
        {null}
      </AppLoadingContainer>
    );
  }

  return (
    <EditViewContent
      store={store}
      baselineDocument={baselineDocument}
      dramaId={dramaIdText}
    />
  );
}

function EditViewContent({
  store,
  baselineDocument,
  dramaId,
}: {
  store: ReturnType<typeof createEditStore>;
  baselineDocument: ReturnType<typeof cloneDramaFlowDocument>;
  dramaId: string;
}) {
  const { t } = useTranslation();
  const currentStep = useStore(store, (s) => s.flowStep);
  const setCurrentStep = useStore(store, (s) => s.setFlowStep);

  useEffect(() => {
    if (!SHOW_DEV_ONLY_UI && currentStep === 3) {
      setCurrentStep(2);
    }
  }, [currentStep, setCurrentStep]);

  return (
    <DramaFlowConfigContext.Provider
      value={{ mode: 'edit', dramaId, baselineDocument }}
    >
      <DramaFlowContext.Provider value={store}>
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
              <PageTitleSection title={t('编辑短剧')} />
              {currentStep === 1 ? (
                <DramaFlowBasicInfoStep onGoToStep={setCurrentStep} />
              ) : currentStep === 2 ? (
                <DramaFlowEpisodeStep onGoToStep={setCurrentStep} />
              ) : SHOW_DEV_ONLY_UI ? (
                <DramaFlowRoleStep onGoToStep={setCurrentStep} />
              ) : null}
            </div>
          </ContentContainer>
        </main>
      </DramaFlowContext.Provider>
    </DramaFlowConfigContext.Provider>
  );
}
