import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { isAxiosError } from 'axios';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  getListDramasQueryKey,
  useCreateDrama,
} from '@/api/__generated__/story/create-drama/create-drama';
import { useDramaFlowConfig } from '@/features/drama-flow/contexts/DramaFlowConfigContext';
import {
  useDramaFlowStore,
  useDramaFlowStoreContext,
} from '@/features/drama-flow/hooks/useDramaFlowStore';
import {
  buildBatchCreateDramaRequest,
  buildSubmitDramaEditRequest,
  hasEditSubmissionChanges,
} from '@/features/drama-flow/utils/buildDramaFlowRequests';
import { hasEpisodesMissingVideoDimensions } from '@/features/drama-flow/utils/dramaFlowEpisodeUtils';
import { submitCreatorDramaUpdate } from '@/features/edit/editDramaApi';

export function useDramaFlowSubmitReview() {
  const { t } = useTranslation();
  const { mode, baselineDocument, dramaId } = useDramaFlowConfig();
  const isEditMode = mode === 'edit';
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const _store = useDramaFlowStoreContext();
  const document = useDramaFlowStore((s) => s.document);
  const replaceRoles = useDramaFlowStore((s) => s.replaceRoles);
  const isSubmitting = useDramaFlowStore((s) => s.isSubmitting);
  const [submitSuccessOpen, setSubmitSuccessOpen] = useState(false);
  const [submitSucceeded, setSubmitSucceeded] = useState(false);
  const submitSucceededRef = useRef(false);

  const { mutateAsync: submitBatchDrama, isPending: isCreatePending } =
    useCreateDrama();

  const handleSubmitReview = () => {
    const storeState = _store.getState();
    if (storeState.isSubmitting || submitSucceededRef.current) {
      return;
    }

    if (hasEpisodesMissingVideoDimensions(document.episodes)) {
      toast.error(t('剧集视频分辨率尚未读取完成，请稍候或重新上传后再提交'));
      return;
    }

    const boundRoles = (document.roles ?? [])
      .filter((role) => role.actorCollectionId != null)
      .map((role, index) => ({
        ...role,
        sortNo: index + 1,
      }));

    storeState.setSubmitting(true);
    storeState.setSubmitError(null);
    replaceRoles(boundRoles);

    void (async () => {
      let didSucceed = false;

      try {
        const doc = _store.getState().document;

        if (isEditMode) {
          if (!dramaId || !baselineDocument) {
            toast.error(t('发布失败，请重试'));
            return;
          }

          if (!hasEditSubmissionChanges(doc, baselineDocument)) {
            toast.error(t('没有修改内容'));
            return;
          }

          const request = buildSubmitDramaEditRequest(doc, baselineDocument);
          await submitCreatorDramaUpdate(dramaId, request);
        } else {
          const request = buildBatchCreateDramaRequest(doc);
          await submitBatchDrama({ data: request });
        }

        await queryClient.invalidateQueries({
          queryKey: getListDramasQueryKey(),
        });
        didSucceed = true;
        submitSucceededRef.current = true;
        setSubmitSucceeded(true);
        setSubmitSuccessOpen(true);
        _store.getState().setSubmitting(false);
      } catch (error) {
        _store.getState().setSubmitError('submit-failed');

        if (isAxiosError(error)) {
          toast.error(t('发布失败，请重试'));
        }
      } finally {
        if (!didSucceed) {
          _store.getState().setSubmitting(false);
        }
      }
    })();
  };

  const handleSubmitSuccessConfirm = () => {
    _store.getState().resetAll();
    void navigate({ to: '/creation-management' });
  };

  return {
    handleSubmitReview,
    submitSuccessOpen,
    setSubmitSuccessOpen,
    handleSubmitSuccessConfirm,
    submitPending: isSubmitting || submitSucceeded || isCreatePending,
  };
}
