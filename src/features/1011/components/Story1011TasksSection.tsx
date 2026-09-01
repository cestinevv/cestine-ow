import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { getMyRankQueryKey } from '@/api/__generated__/wallet/activity-leaderboard/activity-leaderboard';
import {
  getListTaskStatusQueryKey,
  useCompleteTask,
  useListTaskStatus,
} from '@/api/__generated__/wallet/activity-task/activity-task';
import type { CompleteTaskResponse } from '@/api/__generated__/wallet/model/completeTaskResponse';
import type { TaskStatusItem } from '@/api/__generated__/wallet/model/taskStatusItem';
import type { TaskStatusResponse } from '@/api/__generated__/wallet/model/taskStatusResponse';
import IconSocialX from '@/assets/svg/IconSocialX';
import IconStoryCheckinPlay from '@/assets/svg/IconStoryCheckinPlay';
import AppLoadingContainer from '@/components/common/AppLoadingContainer';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GameDialogSubmitLabel } from '@/features/game/components/GameDialogSubmitLabel';
import { unwrapOrvalPayload } from '@/features/mining/miningFormat';
import { useAppLogin } from '@/hooks/useAppLogin';
import { useConfigStore } from '@/stores/config';
import useGlobalStore from '@/stores/global';
import { cn } from '@/utils';
import { formatNumber } from '@/utils/formatNumber';

import { story1011Media } from '../constants/story1011Media';
import { useStory1011TwitterBind } from '../hooks/useStory1011TwitterBind';
import { listStory1011TaskStatus } from '../utils/listStory1011TaskStatus';
import {
  getStory1011TaskAction,
  isStory1011TaskId,
  orderStory1011Tasks,
  resolveStory1011ActivityConfig,
  STORY_1011_TASK_META,
  Story1011TaskAction,
  Story1011TaskIconKind,
  Story1011TaskKind,
} from '../utils/story1011Format';
import { Story1011PointsRewardDialog } from './Story1011PointsRewardDialog';

/** 社交任务「前往」后领取冷却秒数 */
const SOCIAL_CLAIM_COUNTDOWN_SECONDS = 5;

type Story1011TasksSectionProps = {
  /** 嵌入外层合并卡片时去掉自身 section 描边 */
  embedded?: boolean;
};

export function Story1011TasksSection({
  embedded = false,
}: Story1011TasksSectionProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { login } = useAppLogin();
  const isLogin = useGlobalStore((state) => state.isLogin);
  const activityConfig = useConfigStore((state) => state.activityConfig);
  const activityId = resolveStory1011ActivityConfig(activityConfig)?.activityId;
  // 110203（活动已结束）走自定义 mutator：静默 toast 并刷新页面
  const tasksQuery = useListTaskStatus(activityId ?? 0, {
    query: {
      enabled: isLogin && activityId != null,
      retry: false,
      queryFn: ({ signal }) => {
        if (!isLogin || activityId == null) {
          return Promise.reject(new Error('Not logged in'));
        }

        return listStory1011TaskStatus(activityId, { signal });
      },
    },
  });
  const completeMutation = useCompleteTask();
  const { isBound, isStatusPending, startTwitterBind } =
    useStory1011TwitterBind();
  const [claimingTaskId, setClaimingTaskId] = useState<number | undefined>();
  /** 社交任务前往后倒计时：taskId → 剩余秒数；0 表示可领取 */
  const [countdownByTaskId, setCountdownByTaskId] = useState<
    Record<number, number>
  >({});
  const [isRewardOpen, setIsRewardOpen] = useState(false);
  const [rewardPoints, setRewardPoints] = useState<number | undefined>();

  const tasks = orderStory1011Tasks(
    unwrapOrvalPayload<TaskStatusResponse>(tasksQuery.data)?.tasks,
  );
  const socialTasks = tasks.filter((task) => {
    if (!task.type || !isStory1011TaskId(task.type)) {
      return false;
    }

    return STORY_1011_TASK_META[task.type].kind === Story1011TaskKind.Social;
  });
  const productTasks = tasks.filter((task) => {
    if (!task.type || !isStory1011TaskId(task.type)) {
      return false;
    }

    return STORY_1011_TASK_META[task.type].kind === Story1011TaskKind.Product;
  });

  const hasActiveCountdown = Object.values(countdownByTaskId).some(
    (seconds) => seconds > 0,
  );

  useEffect(() => {
    if (!hasActiveCountdown) {
      return;
    }

    const timer = window.setInterval(() => {
      setCountdownByTaskId((prev) => {
        let changed = false;
        const next: Record<number, number> = { ...prev };

        for (const [taskIdKey, seconds] of Object.entries(prev)) {
          if (seconds <= 0) {
            continue;
          }

          next[Number(taskIdKey)] = seconds - 1;
          changed = true;
        }

        return changed ? next : prev;
      });
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [hasActiveCountdown]);

  /** 领取积分：POST complete 后刷新任务列表与我的排名，并弹出积分奖励 */
  async function handleClaimTask(taskId: number) {
    if (!isLogin) {
      login();
      return;
    }

    if (activityId == null) {
      return;
    }

    setClaimingTaskId(taskId);

    try {
      const response = await completeMutation.mutateAsync({
        activityId,
        taskId,
      });
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: getListTaskStatusQueryKey(activityId),
        }),
        queryClient.invalidateQueries({
          queryKey: getMyRankQueryKey({
            activityId,
          }),
        }),
      ]);

      const result = unwrapOrvalPayload<CompleteTaskResponse>(response);
      setRewardPoints(result?.points);
      setIsRewardOpen(true);
    } catch {
      /* appAxiosInstance 已 toast */
    } finally {
      setClaimingTaskId(undefined);
    }
  }

  /** 新开窗口打开任务 linkUrl */
  function handleOpenLink(linkUrl: string) {
    if (!isLogin) {
      login();
      return;
    }

    window.open(linkUrl, '_blank', 'noopener,noreferrer');
  }

  /** 社交任务前往：未绑 X 则走绑定 OAuth；已绑则开链并启动领取倒计时 */
  async function handleGoVisit(taskId: number, linkUrl: string) {
    if (!isLogin) {
      login();
      return;
    }

    if (isStatusPending) {
      return;
    }

    if (!isBound) {
      await startTwitterBind();
      return;
    }

    window.open(linkUrl, '_blank', 'noopener,noreferrer');
    setCountdownByTaskId((prev) => ({
      ...prev,
      [taskId]: SOCIAL_CLAIM_COUNTDOWN_SECONDS,
    }));
  }

  const content = (
    <>
      {embedded ? null : (
        <h2 className="m-0 text-lg leading-6.5 font-bold tracking-[-0.04px] text-foreground">
          {t('做任务赚积分')}
        </h2>
      )}

      <AppLoadingContainer
        data={tasks}
        isLoading={tasksQuery.isPending}
        isError={tasksQuery.isError}
        minHeight={180}
        scrollable={false}
        emptyDescription={t('暂无任务')}
      >
        {/* 桌面：可视约 6 列宽；溢出时用自定义滚动条常显（不依赖系统 overlay） */}
        <div className="@container/story-tasks hidden w-full min-w-0 lg:block">
          <ScrollArea
            orientation="horizontal"
            className={cn(
              // Layout
              'w-full',
              // 隐藏 Viewport 原生滚动条，避免与自定义条叠两层
              '[&_[data-slot=scroll-area-viewport]]:[scrollbar-width:none]',
              '[&_[data-slot=scroll-area-viewport]]:[-ms-overflow-style:none]',
              '[&_[data-slot=scroll-area-viewport]]:[&::-webkit-scrollbar]:hidden',
              // 底部留出细滚动条高度，避免盖住卡片
              '[&_[data-slot=scroll-area-viewport]]:pb-3',
              // 自定义横条：始终可见、更细、活动主题色
              '[&_[data-slot=scroll-area-scrollbar][data-orientation=horizontal]]:h-1',
              '[&_[data-slot=scroll-area-scrollbar][data-orientation=horizontal]]:border-0',
              '[&_[data-slot=scroll-area-scrollbar][data-orientation=horizontal]]:bg-story-checkin-accent/16',
              '[&_[data-slot=scroll-area-scrollbar][data-orientation=horizontal]]:p-0',
              '[&_[data-slot=scroll-area-scrollbar][data-orientation=horizontal]]:pointer-events-auto',
              '[&_[data-slot=scroll-area-scrollbar][data-orientation=horizontal]]:opacity-100',
              '[&_[data-slot=scroll-area-thumb]]:rounded-full [&_[data-slot=scroll-area-thumb]]:bg-story-checkin-accent',
            )}
          >
            <ul className="m-0 flex w-max min-w-full list-none gap-3 p-0">
              {tasks.map((task) => (
                <li
                  key={task.taskId}
                  className="w-[calc((100cqw-3.75rem)/6)] shrink-0"
                >
                  <DesktopTaskCard
                    task={task}
                    isClaiming={claimingTaskId === task.taskId}
                    countdownSeconds={
                      task.taskId === undefined
                        ? undefined
                        : countdownByTaskId[task.taskId]
                    }
                    onClaim={handleClaimTask}
                    onOpenLink={handleOpenLink}
                    onGoVisit={handleGoVisit}
                  />
                </li>
              ))}
            </ul>
          </ScrollArea>
        </div>

        {/* 移动：横向列表 — Figma H5 7064:82903 */}
        <ul className="m-0 flex list-none flex-col gap-5 p-0 lg:hidden">
          {socialTasks.map((task) => (
            <li key={task.taskId} className="min-w-0">
              <MobileTaskRow
                task={task}
                isClaiming={claimingTaskId === task.taskId}
                countdownSeconds={
                  task.taskId === undefined
                    ? undefined
                    : countdownByTaskId[task.taskId]
                }
                onClaim={handleClaimTask}
                onOpenLink={handleOpenLink}
                onGoVisit={handleGoVisit}
              />
            </li>
          ))}
          {socialTasks.length > 0 && productTasks.length > 0 ? (
            <li aria-hidden className="m-0 list-none p-0">
              <hr className="m-0 h-px w-full border-0 bg-border" />
            </li>
          ) : null}
          {productTasks.map((task) => (
            <li key={task.taskId} className="min-w-0">
              <MobileTaskRow
                task={task}
                isClaiming={claimingTaskId === task.taskId}
                countdownSeconds={
                  task.taskId === undefined
                    ? undefined
                    : countdownByTaskId[task.taskId]
                }
                onClaim={handleClaimTask}
                onOpenLink={handleOpenLink}
                onGoVisit={handleGoVisit}
              />
            </li>
          ))}
        </ul>
      </AppLoadingContainer>

      <Story1011PointsRewardDialog
        open={isRewardOpen}
        onOpenChange={setIsRewardOpen}
        points={rewardPoints}
      />
    </>
  );

  if (embedded) {
    return <div className="flex w-full flex-col gap-4">{content}</div>;
  }

  return (
    <section
      className={cn(
        // Layout & Positioning
        'flex w-full flex-col',
        // Sizing & Spacing — Figma 标题与列表间距 16px
        'gap-4 rounded-xl border p-5 lg:p-6',
        // Visuals & Typography
        'border-story-checkin-accent/16 bg-card',
      )}
    >
      {content}
    </section>
  );
}

function TaskIcon({ icon }: { icon: Story1011TaskIconKind }) {
  if (icon === Story1011TaskIconKind.SocialX) {
    return <IconSocialX className="size-6 shrink-0 text-foreground" />;
  }

  return <IconStoryCheckinPlay className="size-6 shrink-0" />;
}

function DesktopTaskCard({
  task,
  isClaiming,
  countdownSeconds,
  onClaim,
  onOpenLink,
  onGoVisit,
}: {
  task: TaskStatusItem;
  isClaiming: boolean;
  countdownSeconds: number | undefined;
  onClaim: (taskId: number) => void;
  onOpenLink: (linkUrl: string) => void;
  onGoVisit: (taskId: number, linkUrl: string) => void;
}) {
  const { t } = useTranslation();

  if (
    task.taskId === undefined ||
    !task.type ||
    !isStory1011TaskId(task.type)
  ) {
    return null;
  }

  const meta = STORY_1011_TASK_META[task.type];
  const action = getStory1011TaskAction(task);
  const isClaimed = action === Story1011TaskAction.Claimed;

  return (
    <article
      className={cn(
        // Layout & Positioning
        'flex h-full flex-col items-center justify-center',
        // Sizing & Spacing
        'gap-3 rounded-2xl border p-4',
        // Visuals & Typography
        'border-story-checkin-accent/16 bg-linear-to-b from-story-checkin-accent/5 to-transparent',
      )}
    >
      <div className="flex w-full flex-col items-center gap-2">
        <TaskIcon icon={meta.icon} />
        <p className="m-0 w-full text-center text-xs leading-4 tracking-[0.04px] text-muted-foreground">
          {t(meta.categoryKey)}
        </p>
        <h3 className="m-0 w-full text-center text-sm leading-5 font-normal text-foreground">
          {t(meta.titleKey)}
        </h3>
      </div>

      <div className="flex items-center justify-center gap-1">
        <img
          src={story1011Media.pointsCoin}
          alt=""
          width={20}
          height={20}
          className={cn('size-5 object-cover', isClaimed && 'opacity-50')}
        />
        <span
          className={cn(
            'text-base leading-6 font-medium',
            isClaimed ? 'text-muted-foreground' : 'text-foreground',
          )}
        >
          {task.points === undefined ? '—' : `+${formatNumber(task.points)}`}
        </span>
      </div>

      <TaskActionButton
        task={task}
        action={action}
        fullWidth
        isClaiming={isClaiming}
        countdownSeconds={countdownSeconds}
        onClaim={onClaim}
        onOpenLink={onOpenLink}
        onGoVisit={onGoVisit}
      />
    </article>
  );
}

function MobileTaskRow({
  task,
  isClaiming,
  countdownSeconds,
  onClaim,
  onOpenLink,
  onGoVisit,
}: {
  task: TaskStatusItem;
  isClaiming: boolean;
  countdownSeconds: number | undefined;
  onClaim: (taskId: number) => void;
  onOpenLink: (linkUrl: string) => void;
  onGoVisit: (taskId: number, linkUrl: string) => void;
}) {
  const { t } = useTranslation();

  if (
    task.taskId === undefined ||
    !task.type ||
    !isStory1011TaskId(task.type)
  ) {
    return null;
  }

  const meta = STORY_1011_TASK_META[task.type];
  const action = getStory1011TaskAction(task);

  return (
    <article className="flex w-full items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-2">
        <div className="flex shrink-0 items-center justify-center">
          <TaskIcon icon={meta.icon} />
        </div>

        <div className="flex min-w-0 flex-col gap-0.5">
          <h3 className="m-0 text-[15px] leading-5.5 font-normal text-foreground">
            {t(meta.titleKey)}
          </h3>

          <div className="flex items-center gap-1">
            <span
              className={cn(
                'inline-flex items-center justify-center rounded px-1 py-0.5',
                // 稿面 10px，移动端字号下限钳制为 12px
                'bg-background text-xs leading-3 tracking-[0.08px] text-foreground',
              )}
            >
              {t(meta.categoryKey)}
            </span>

            <div className="flex items-center gap-0.5">
              <img
                src={story1011Media.pointsCoin}
                alt=""
                width={16}
                height={16}
                className="size-4 object-cover"
              />
              <span className="text-xs leading-4 font-medium tracking-[0.04px] text-muted-foreground">
                {task.points === undefined
                  ? '—'
                  : `+${formatNumber(task.points)}`}
              </span>
            </div>
          </div>
        </div>
      </div>

      <TaskActionButton
        task={task}
        action={action}
        fullWidth={false}
        isClaiming={isClaiming}
        countdownSeconds={countdownSeconds}
        onClaim={onClaim}
        onOpenLink={onOpenLink}
        onGoVisit={onGoVisit}
      />
    </article>
  );
}

function TaskActionButton({
  task,
  action,
  fullWidth,
  isClaiming,
  countdownSeconds,
  onClaim,
  onOpenLink,
  onGoVisit,
}: {
  task: TaskStatusItem;
  action: Story1011TaskAction | undefined;
  fullWidth: boolean;
  isClaiming: boolean;
  countdownSeconds: number | undefined;
  onClaim: (taskId: number) => void;
  onOpenLink: (linkUrl: string) => void;
  onGoVisit: (taskId: number, linkUrl: string) => void;
}) {
  const { t } = useTranslation();
  const widthClass = fullWidth ? 'w-full' : 'w-auto shrink-0';

  if (
    task.taskId === undefined ||
    !task.type ||
    !isStory1011TaskId(task.type) ||
    !action
  ) {
    return null;
  }

  const taskId = task.taskId;
  const linkUrl = task.linkUrl?.trim();

  /** 点击领取：调用 complete 接口 */
  function handleClaimClick() {
    onClaim(taskId);
  }

  /** 点击前往：开链并启动倒计时 */
  function handleGoVisitClick() {
    if (!linkUrl) {
      return;
    }

    onGoVisit(taskId, linkUrl);
  }

  /** 点击去完成：新开 linkUrl */
  function handleGoCompleteClick() {
    if (!linkUrl) {
      return;
    }

    onOpenLink(linkUrl);
  }

  if (action === Story1011TaskAction.Claimed) {
    return (
      <Button
        type="button"
        disabled
        className={cn(
          'h-auto shrink-0 rounded border-[1.5px] border-border bg-transparent px-3 py-1.5',
          widthClass,
          // Figma colors/page&sheet/unavailable（描边禁用，非填充）
          'text-sm leading-5 font-bold text-button-disabled-foreground',
          'disabled:opacity-100 disabled:bg-transparent disabled:text-button-disabled-foreground',
        )}
      >
        {t('已领取')}
      </Button>
    );
  }

  // 社交 NOT_DONE：前往 → 倒计时 → 领取
  if (action === Story1011TaskAction.GoVisit) {
    if (countdownSeconds !== undefined && countdownSeconds > 0) {
      return (
        <Button
          type="button"
          disabled
          className={cn(
            'h-auto shrink-0 rounded border-[1.5px] border-border bg-transparent px-3 py-1.5',
            widthClass,
            'text-sm leading-5 font-bold text-button-disabled-foreground',
            'disabled:opacity-100 disabled:bg-transparent disabled:text-button-disabled-foreground',
          )}
        >
          {t('领取({{seconds}}s)', { seconds: countdownSeconds })}
        </Button>
      );
    }

    if (countdownSeconds === 0) {
      return (
        <Button
          type="button"
          disabled={isClaiming}
          onClick={handleClaimClick}
          className={cn(
            'h-auto shrink-0 rounded bg-story-checkin-accent px-3 py-1.5',
            widthClass,
            'text-sm leading-5 font-bold text-primary-foreground',
            'hover:bg-story-checkin-accent/90',
            // claiming 保留强调色，勿被 default 禁用填充覆盖
            'disabled:opacity-100 disabled:bg-story-checkin-accent disabled:text-primary-foreground',
          )}
        >
          <GameDialogSubmitLabel isPending={isClaiming}>
            {t('领取')}
          </GameDialogSubmitLabel>
        </Button>
      );
    }

    if (!linkUrl) {
      return null;
    }

    return (
      <Button
        type="button"
        variant="outline"
        onClick={handleGoVisitClick}
        className={cn(
          'h-auto shrink-0 rounded border-[1.5px] border-story-checkin-accent bg-transparent px-3 py-1.5',
          widthClass,
          'text-sm leading-5 font-bold text-story-checkin-accent',
          'hover:border-story-checkin-accent/90 hover:bg-story-checkin-accent/5 hover:text-story-checkin-accent/90',
        )}
      >
        {t('前往')}
      </Button>
    );
  }

  if (action === Story1011TaskAction.Claim) {
    return (
      <Button
        type="button"
        disabled={isClaiming}
        onClick={handleClaimClick}
        className={cn(
          'h-auto shrink-0 rounded bg-story-checkin-accent px-3 py-1.5',
          widthClass,
          'text-sm leading-5 font-bold text-primary-foreground',
          'hover:bg-story-checkin-accent/90',
          // claiming 保留强调色，勿被 default 禁用填充覆盖
          'disabled:opacity-100 disabled:bg-story-checkin-accent disabled:text-primary-foreground',
        )}
      >
        <GameDialogSubmitLabel isPending={isClaiming}>
          {t('领取')}
        </GameDialogSubmitLabel>
      </Button>
    );
  }

  if (!linkUrl) {
    return null;
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleGoCompleteClick}
      className={cn(
        'h-auto shrink-0 rounded border-[1.5px] border-story-checkin-accent bg-transparent px-3 py-1.5',
        widthClass,
        'text-sm leading-5 font-bold text-story-checkin-accent',
        'hover:border-story-checkin-accent/90 hover:bg-story-checkin-accent/5 hover:text-story-checkin-accent/90',
      )}
    >
      {t('去完成')}
    </Button>
  );
}
