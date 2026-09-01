import { useQueryClient } from '@tanstack/react-query';
import {
  type ChangeEvent,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { useMyRank } from '@/api/__generated__/wallet/activity-leaderboard/activity-leaderboard';
import type { GetStoryResponse } from '@/api/__generated__/wallet/model/getStoryResponse';
import type { MyRankResponse } from '@/api/__generated__/wallet/model/myRankResponse';
import type { SubmitStoryResponse } from '@/api/__generated__/wallet/model/submitStoryResponse';
import {
  getGetStoryQueryKey,
  useGetStory,
  useSubmitStory,
} from '@/api/__generated__/wallet/story-checkin/story-checkin';
import AppLoadingContainer from '@/components/common/AppLoadingContainer';
import { ContentContainer } from '@/components/common/ContentContainer';
import { unwrapOrvalPayload } from '@/features/mining/miningFormat';
import { useAppLogin } from '@/hooks/useAppLogin';
import {
  hydrateStory1011StoreFromStorage,
  useStory1011Store,
} from '@/stores/1011';
import { useConfigStore } from '@/stores/config';
import useGlobalStore from '@/stores/global';
import { cn } from '@/utils';
import { Story1011Form } from './components/Story1011Form';
import { Story1011Intro } from './components/Story1011Intro';
import { Story1011SuccessDialog } from './components/Story1011SuccessDialog';
import { Story1011Toolbar } from './components/Story1011Toolbar';
import {
  STORY_1011_CONTENT_MAX,
  STORY_1011_CONTENT_MIN,
  STORY_1011_IMAGE_MAX_BYTES,
} from './constants/story1011Constants';
import { story1011Media } from './constants/story1011Media';
import { useStory1011TwitterBindResultListener } from './hooks/useStory1011TwitterBind';
import { Story1011BoardedView } from './Story1011BoardedView';
import { getStory1011Story } from './utils/getStory1011Story';
import {
  formatStory1011DeadlineDate,
  isStory1011ActivityEnded,
  isStory1011ActivityNotStarted,
  resolveStory1011ActivityConfig,
} from './utils/story1011Format';
import { uploadStory1011Image } from './utils/uploadStory1011Image';

const ONE_MINUTE_MS = 60_000;

export function Story1011View() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { login } = useAppLogin();

  useStory1011TwitterBindResultListener();

  const isLogin = useGlobalStore((state) => state.isLogin);
  const hasHydrated = useStory1011Store((state) => state.hasHydrated);
  const story = useStory1011Store((state) => state.story);
  const setStory = useStory1011Store((state) => state.setStory);
  const activityConfig = useConfigStore((state) => state.activityConfig);
  const story1011ActivityConfig =
    resolveStory1011ActivityConfig(activityConfig);
  // 首次无 persist 时为空，等全局配置写入后再开请求；已持久化则可立刻启用
  const activityId = story1011ActivityConfig?.activityId;
  const activityStartAt = story1011ActivityConfig?.activityStartAt;
  const activityEndAt = story1011ActivityConfig?.activityEndAt;

  // 绘制前同步灌入 localStorage，避免刷新时先闪未提交态 / Toolbar
  useLayoutEffect(() => {
    hydrateStory1011StoreFromStorage();
  }, []);

  // 仅触发请求 + 成功后写入 store；渲染不读 query 结果
  // enabled 绑 activityId：首次等配置落盘，之后 store 有值即立刻打 /stories
  const storyQuery = useGetStory(activityId ?? 0, {
    query: {
      enabled: isLogin && activityId != null,
      retry: false,
      refetchOnWindowFocus: false,
      // 未提交故事返回 1200010，归一为空态，不走 error/retry
      queryFn: ({ signal }) => {
        // 双重门禁：即使 enabled 被意外置为 true，仍禁止在未登录时发起 /stories 请求
        if (!isLogin || activityId == null) {
          return Promise.reject(new Error('Not logged in'));
        }

        return getStory1011Story(activityId, { signal });
      },
    },
  });
  const myRankQuery = useMyRank(
    { activityId: activityId ?? 0 },
    { query: { enabled: isLogin && activityId != null } },
  );
  const submitStoryMutation = useSubmitStory();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewUrlRef = useRef<string | undefined>(undefined);
  const formId = useId();

  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | undefined>();
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [isExploreStoryPending, setIsExploreStoryPending] = useState(false);

  const myRank = unwrapOrvalPayload<MyRankResponse>(myRankQuery.data);
  // 活动未开始：强制回未提交板块（即便本地曾持久化过 story）
  const isActivityNotStarted = isStory1011ActivityNotStarted(activityStartAt);
  const isActivityEnded = isStory1011ActivityEnded(activityEndAt);
  const activityEndDateLabel = formatStory1011DeadlineDate(activityEndAt);
  // 是否已提交：只看 store（含持久化）；storyId 缺失/null → 未提交
  const hasSubmittedStory =
    !isActivityNotStarted &&
    story?.storyId !== undefined &&
    story?.storyId !== null;
  const isSubmitting = submitStoryMutation.isPending || isUploadingImage;

  // 按整分对齐：跨越 startAt / endAt 时整页刷新，切到对应态 UI
  // 放在 Story1011View：未开始态不会挂载 BoardedView，须在父级监听
  useEffect(() => {
    const shouldWatchStart = isActivityNotStarted;
    const shouldWatchEnd = activityEndAt !== undefined && !isActivityEnded;

    if (!shouldWatchStart && !shouldWatchEnd) {
      return;
    }

    const wasNotStarted = isActivityNotStarted;
    const wasEnded = isActivityEnded;

    function checkBoundaryAndReload() {
      const nowMs = Date.now();
      const notStartedNow = isStory1011ActivityNotStarted(
        activityStartAt,
        nowMs,
      );
      const endedNow = isStory1011ActivityEnded(activityEndAt, nowMs);

      if (wasNotStarted && !notStartedNow) {
        window.location.reload();
        return;
      }

      if (!wasEnded && endedNow) {
        window.location.reload();
      }
    }

    const msUntilNextMinute = ONE_MINUTE_MS - (Date.now() % ONE_MINUTE_MS);
    let intervalId: number | undefined;
    const timeoutId = window.setTimeout(() => {
      checkBoundaryAndReload();
      intervalId = window.setInterval(checkBoundaryAndReload, ONE_MINUTE_MS);
    }, msUntilNextMinute);

    return () => {
      window.clearTimeout(timeoutId);

      if (intervalId !== undefined) {
        window.clearInterval(intervalId);
      }
    };
  }, [activityEndAt, activityStartAt, isActivityEnded, isActivityNotStarted]);

  // stories 成功 → 只持久化到 store（活动未开始时不写入）
  useEffect(() => {
    if (!storyQuery.isSuccess) {
      return;
    }

    if (isActivityNotStarted) {
      return;
    }

    const nextStory = unwrapOrvalPayload<GetStoryResponse>(storyQuery.data);

    if (nextStory === undefined) {
      return;
    }

    // 协议空态可能为 null；归一为无 story 的对象
    if (nextStory === null) {
      setStory(null);
      return;
    }

    setStory(nextStory);
  }, [isActivityNotStarted, setStory, storyQuery.data, storyQuery.isSuccess]);

  // 退出登录或未登录：清空持久化的故事，避免误展示上一账号的登船态
  useEffect(() => {
    if (!isLogin) {
      setStory(null);
    }
  }, [isLogin, setStory]);

  // 活动未开始且本地仍有 story：清空，回到未提交板块
  useEffect(() => {
    if (isActivityNotStarted && story !== null) {
      setStory(null);
    }
  }, [isActivityNotStarted, setStory, story]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  function handlePickImage() {
    fileInputRef.current?.click();
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    event.target.value = '';

    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = undefined;
    }

    if (!nextFile) {
      setImageFile(null);
      setImagePreviewUrl(undefined);
      return;
    }

    if (nextFile.size > STORY_1011_IMAGE_MAX_BYTES) {
      toast.error(t('图片不超过 5MB'));
      setImageFile(null);
      setImagePreviewUrl(undefined);
      return;
    }

    const previewUrl = URL.createObjectURL(nextFile);
    previewUrlRef.current = previewUrl;
    setImageFile(nextFile);
    setImagePreviewUrl(previewUrl);
  }

  function handleClearImage() {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = undefined;
    }

    setImageFile(null);
    setImagePreviewUrl(undefined);
  }

  function handleContentChange(value: string) {
    setContent(value);
  }

  function handleSuccessDialogOpenChange(open: boolean) {
    if (!open && isExploreStoryPending) {
      return;
    }

    setIsSuccessDialogOpen(open);
  }

  // 「开始探索」：拉取 /stories 写入 store 后进入已登船态
  async function handleExploreAfterSubmit() {
    if (!isLogin || isExploreStoryPending || activityId == null) {
      return;
    }

    setIsExploreStoryPending(true);

    try {
      const response = await queryClient.fetchQuery({
        queryKey: getGetStoryQueryKey(activityId),
        queryFn: ({ signal }) => getStory1011Story(activityId, { signal }),
      });

      const nextStory = unwrapOrvalPayload<GetStoryResponse>(response);

      if (nextStory === undefined) {
        return;
      }

      if (nextStory === null) {
        setStory(null);
      } else {
        setStory(nextStory);
      }

      setIsSuccessDialogOpen(false);
    } catch {
      /* appAxiosInstance 已 toast */
    } finally {
      setIsExploreStoryPending(false);
    }
  }

  async function handleSubmit() {
    if (isActivityNotStarted || isActivityEnded) {
      return;
    }

    if (!isLogin) {
      login();
      return;
    }

    const trimmed = content.trim();

    if (trimmed.length < STORY_1011_CONTENT_MIN) {
      toast.error(t('请填写你的 1011 故事'));
      return;
    }

    if (trimmed.length > STORY_1011_CONTENT_MAX) {
      toast.error(t('故事内容不能超过 1000 字'));
      return;
    }

    if (imageFile && imageFile.size > STORY_1011_IMAGE_MAX_BYTES) {
      toast.error(t('图片不超过 5MB'));
      return;
    }

    if (activityId == null) {
      return;
    }

    try {
      const response = await submitStoryMutation.mutateAsync({
        activityId,
        data: {
          content: trimmed,
          ...(imageFile ? { imageFileName: imageFile.name } : {}),
        },
      });

      if (response.status !== 200) {
        return;
      }

      const submitResult = unwrapOrvalPayload<SubmitStoryResponse>(response);

      if (imageFile && submitResult?.urlResult?.uploadUrl) {
        setIsUploadingImage(true);

        try {
          await uploadStory1011Image(imageFile, submitResult.urlResult);
        } catch {
          toast.error(t('图片上传失败，请重试'));
          return;
        } finally {
          setIsUploadingImage(false);
        }
      }

      setIsSuccessDialogOpen(true);
    } catch {
      /* appAxiosInstance 已 toast */
    }
  }

  // store 水合完成前：整页 loading，不渲染表单 / Toolbar（积分、推特）/ 已登船态
  if (!hasHydrated) {
    return (
      <div
        className={cn(
          // Layout & Positioning
          'relative flex min-h-0 w-full min-w-0 flex-1 flex-col',
          // Visuals — Figma 6952:36847 story Bg
          'bg-story-checkin-page-bg',
        )}
      >
        <AppLoadingContainer
          data={[]}
          isLoading
          minHeight={480}
          scrollable={false}
        >
          {null}
        </AppLoadingContainer>
      </div>
    );
  }

  if (hasSubmittedStory) {
    return (
      <>
        <Story1011BoardedView myRank={myRank ?? undefined} />
        <Story1011SuccessDialog
          open={isSuccessDialogOpen}
          onOpenChange={handleSuccessDialogOpenChange}
          onExplore={handleExploreAfterSubmit}
          isExplorePending={isExploreStoryPending}
        />
      </>
    );
  }

  return (
    <div
      className={cn(
        // Layout & Positioning
        'relative flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden',
        // Visuals — Figma 6952:36847 story Bg #111113（深）/ #f8f9fb（浅）
        'bg-story-checkin-page-bg',
      )}
    >
      <img
        src={story1011Media.heroBg}
        alt=""
        className={cn(
          // Layout & Positioning
          'pointer-events-none absolute inset-0 size-full object-cover',
        )}
        style={{ opacity: 'var(--story-checkin-hero-light-opacity)' }}
      />
      {/* Figma 6962:37865 — 深色专用方舟底图（2× JPG） */}
      <img
        src={story1011Media.heroBgDark}
        alt=""
        className={cn(
          // Layout & Positioning
          'pointer-events-none absolute inset-0 size-full object-cover',
        )}
        style={{ opacity: 'var(--story-checkin-hero-dark-opacity)' }}
      />
      {/* Figma 6962:37507 — 左侧压暗（深色）；浅色 token 为透明 */}
      <div
        aria-hidden
        className={cn(
          // Layout & Positioning
          'pointer-events-none absolute inset-y-0 left-0 z-[1]',
          // Sizing — 稿面 885/1920
          'w-[min(100%,885px)]',
        )}
        style={{ backgroundImage: 'var(--story-checkin-form-vignette)' }}
      />

      <div className="relative z-10 flex min-h-0 w-full flex-1 flex-col">
        <Story1011Toolbar totalPoints={myRank?.totalPoints} />

        <ContentContainer
          className={cn(
            // Layout & Positioning
            'relative flex flex-1 items-start justify-center lg:justify-start',
            // Sizing & Spacing
            'py-8 lg:pt-[105px] lg:pb-[80px]',
          )}
        >
          <article
            className={cn(
              // Layout & Positioning
              'relative z-10 flex w-full flex-col gap-6 lg:gap-8',
              // Sizing & Spacing
              'max-w-[700px] rounded p-5 lg:p-8',
              // Visuals & Typography
              'border border-story-checkin-card-border bg-story-checkin-card backdrop-blur-[10px]',
            )}
            aria-labelledby={formId}
          >
            <div id={formId}>
              <Story1011Intro />
            </div>
            <Story1011Form
              content={content}
              imagePreviewUrl={imagePreviewUrl}
              isSubmitting={isSubmitting}
              isActivityNotStarted={isActivityNotStarted}
              isActivityEnded={isActivityEnded}
              activityEndDateLabel={activityEndDateLabel}
              fileInputRef={fileInputRef}
              onContentChange={handleContentChange}
              onPickImage={handlePickImage}
              onImageChange={handleImageChange}
              onClearImage={handleClearImage}
              onSubmit={handleSubmit}
            />
          </article>

          <aside
            className={cn(
              // Layout & Positioning
              'pointer-events-none absolute right-10 bottom-0 hidden lg:block',
              // Sizing & Spacing
              'w-[329px]',
            )}
          >
            <div className="relative">
              <div
                className={cn(
                  // Layout & Positioning
                  'absolute top-0 -left-20 z-10 flex items-center justify-center',
                  // Sizing & Spacing
                  'rounded-tl-[23px] rounded-tr-[23px] rounded-bl-[23px] px-6 py-2',
                  // Visuals & Typography
                  'border border-story-checkin-accent bg-story-checkin-bubble text-base leading-6 text-foreground',
                )}
              >
                {t('写下你的1011故事')}
              </div>
              <img
                src={story1011Media.character}
                alt=""
                width={329}
                height={591}
                className="mt-5 h-auto w-full object-contain"
              />
            </div>
          </aside>
        </ContentContainer>
      </div>

      <Story1011SuccessDialog
        open={isSuccessDialogOpen}
        onOpenChange={handleSuccessDialogOpenChange}
        onExplore={handleExploreAfterSubmit}
        isExplorePending={isExploreStoryPending}
      />
    </div>
  );
}
