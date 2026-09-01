import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { ReviewResponse } from '@/api/__generated__/story/model/reviewResponse';
import IconPlayRatingStar from '@/assets/svg/IconPlayRatingStar';
import { AppDialog } from '@/components/common/AppDialog';
import { APP_DIALOG_PRIMARY_FULL_WIDTH_BUTTON_CLASS } from '@/components/common/appDialogButton';
import { Button } from '@/components/ui/button';
import { usePlayRequireLogin } from '@/features/play/hooks/usePlayRequireLogin';
import {
  getPlayDramaDetailQueryKey,
  getPlayMyReview,
  getPlayMyReviewQueryKey,
  postPlayReview,
} from '@/features/play/playDramaApi';
import { unwrapOrvalPayload } from '@/features/play/playFormat';
import { useProfileBlockInteractionGuard } from '@/features/profile/useProfileBlockInteractionGuard';
import { cn } from '@/utils';

type PlayRatingDialogProps = {
  open: boolean;
  dramaId: string;
  creatorUserId?: string;
  onOpenChange: (open: boolean) => void;
};

export function PlayRatingDialog({
  open,
  dramaId,
  creatorUserId,
  onOpenChange,
}: PlayRatingDialogProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { isLogin, requireLogin } = usePlayRequireLogin();
  const { guardBlockedInteraction } =
    useProfileBlockInteractionGuard(creatorUserId);
  const [selectedScore, setSelectedScore] = useState(0);

  const { data: myReviewResponse } = useQuery({
    queryKey: getPlayMyReviewQueryKey(dramaId),
    queryFn: ({ signal }) => getPlayMyReview(dramaId, { signal }),
    enabled: open && isLogin && dramaId.length > 0,
    retry: false,
  });

  const myReview = unwrapOrvalPayload<ReviewResponse>(myReviewResponse);

  const hasExistingReview = useMemo(() => {
    if (!myReview) {
      return false;
    }
    if (myReview.id !== undefined) {
      return true;
    }
    const r = myReview.rating;
    return typeof r === 'number' && r > 0;
  }, [myReview]);

  useEffect(() => {
    if (!open) {
      return;
    }
    if (hasExistingReview) {
      const r = myReview?.rating;
      if (typeof r === 'number' && r > 0) {
        setSelectedScore(Math.min(5, Math.max(1, r)));
        return;
      }
    }
    setSelectedScore(0);
  }, [open, hasExistingReview, myReview?.rating]);

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
      onOpenChange(false);
    },
    onError: () => {
      toast.error(t('再试一次'));
    },
  });

  const handleSubmitRating = () => {
    if (!requireLogin()) {
      return;
    }
    if (!guardBlockedInteraction('rating')) {
      return;
    }
    if (selectedScore < 1) {
      return;
    }
    postReviewMutation.mutate({ rating: selectedScore });
  };

  const canSubmit =
    isLogin && selectedScore >= 1 && !postReviewMutation.isPending;

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('为作品评分')}
      width={400}
    >
      <div className={cn('flex flex-col gap-8')}>
        <div className={cn('flex flex-col items-center gap-4')}>
          <div className={cn('flex items-center justify-center gap-3')}>
            {Array.from({ length: 5 }, (_, index) => {
              const score = index + 1;
              const isFilled = selectedScore > 0 && score <= selectedScore;

              return (
                <Button
                  key={score}
                  type="button"
                  variant="ghost"
                  aria-label={String(score)}
                  onClick={() => setSelectedScore(score)}
                  className={cn(
                    'size-8 rounded-full p-0',
                    'text-[var(--play-rating-star)] hover:bg-transparent',
                    'hover:text-[var(--play-rating-star)] active:text-[var(--play-rating-star)]',
                    'focus-visible:text-[var(--play-rating-star)] aria-expanded:text-[var(--play-rating-star)]',
                  )}
                >
                  <IconPlayRatingStar
                    filled={isFilled}
                    className="size-8 shrink-0"
                  />
                </Button>
              );
            })}
          </div>
          <p className={cn('text-sm leading-[22.75px] text-foreground')}>
            {selectedScore > 0
              ? t('您的评分：{{score}}', { score: selectedScore })
              : t('请选择 1～5 星')}
          </p>
        </div>
        <Button
          type="button"
          disabled={!canSubmit}
          onClick={handleSubmitRating}
          className={APP_DIALOG_PRIMARY_FULL_WIDTH_BUTTON_CLASS}
        >
          {hasExistingReview ? t('修改评分') : t('提交评分')}
        </Button>
      </div>
    </AppDialog>
  );
}
