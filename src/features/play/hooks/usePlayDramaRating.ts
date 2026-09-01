import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import type { ReviewResponse } from '@/api/__generated__/story/model/reviewResponse';
import { usePlayRequireLogin } from '@/features/play/hooks/usePlayRequireLogin';
import {
  getPlayDramaDetailQueryKey,
  getPlayMyReview,
  getPlayMyReviewQueryKey,
  postPlayReview,
} from '@/features/play/playDramaApi';
import { unwrapOrvalPayload } from '@/features/play/playFormat';
import { useProfileBlockInteractionGuard } from '@/features/profile/useProfileBlockInteractionGuard';

/**
 * 短剧五星评分：读 my-review，点星即提交，刷新详情与我的评分缓存。
 */
export function usePlayDramaRating(dramaId: string, creatorUserId?: string) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { isLogin, requireLogin } = usePlayRequireLogin();
  const { guardBlockedInteraction } =
    useProfileBlockInteractionGuard(creatorUserId);

  const { data: myReviewResponse } = useQuery({
    queryKey: getPlayMyReviewQueryKey(dramaId),
    queryFn: ({ signal }) => getPlayMyReview(dramaId, { signal }),
    enabled: isLogin && dramaId.length > 0,
    retry: false,
  });

  const myReview = unwrapOrvalPayload<ReviewResponse>(myReviewResponse);
  const myRating =
    typeof myReview?.rating === 'number' && myReview.rating > 0
      ? Math.min(5, Math.max(1, myReview.rating))
      : undefined;

  const postReviewMutation = useMutation({
    mutationFn: (data: { rating: number }) => postPlayReview(dramaId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: getPlayDramaDetailQueryKey(dramaId),
      });
      void queryClient.invalidateQueries({
        queryKey: getPlayMyReviewQueryKey(dramaId),
      });
      toast.success(t('评分成功'));
    },
    onError: () => {
      toast.error(t('再试一次'));
    },
  });

  const submitRating = (rating: number) => {
    if (!requireLogin()) {
      return;
    }

    if (!guardBlockedInteraction('rating')) {
      return;
    }

    if (rating < 1 || rating > 5 || postReviewMutation.isPending) {
      return;
    }

    postReviewMutation.mutate({ rating });
  };

  return {
    myRating,
    isRatingPending: postReviewMutation.isPending,
    submitRating,
  };
}
