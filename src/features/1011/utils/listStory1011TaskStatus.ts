import {
  getListTaskStatusUrl,
  type listTaskStatusResponse,
} from '@/api/__generated__/wallet/activity-task/activity-task';
import { AppBusinessError, appAxiosInstance } from '@/api/appRequest';
import { STORY_1011_ACTIVITY_ENDED_CODE } from '../constants/story1011Constants';

const ACTIVITY_ENDED_RELOAD_KEY_PREFIX = 'story1011:activity-ended-reload:';

function getActivityEndedReloadKey(activityId: number): string {
  return `${ACTIVITY_ENDED_RELOAD_KEY_PREFIX}${activityId}`;
}

/**
 * 活动已结束：整页刷新一次，避免 React Query retry 连打；同 activityId 防死循环。
 * @returns 是否已触发刷新
 */
function reloadPageForActivityEnded(activityId: number): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const reloadKey = getActivityEndedReloadKey(activityId);

  if (window.sessionStorage.getItem(reloadKey) === '1') {
    return false;
  }

  window.sessionStorage.setItem(reloadKey, '1');
  window.location.reload();
  return true;
}

/**
 * 查询活动任务列表。
 * 110203（活动已结束）静默 toast，并刷新页面以切到结束态 UI。
 */
export async function listStory1011TaskStatus(
  activityId: number,
  options?: RequestInit,
): Promise<listTaskStatusResponse> {
  try {
    const response = await appAxiosInstance<listTaskStatusResponse>(
      getListTaskStatusUrl(activityId),
      {
        ...options,
        method: 'GET',
      },
      { silentBusinessCodes: [STORY_1011_ACTIVITY_ENDED_CODE] },
    );

    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(getActivityEndedReloadKey(activityId));
    }

    return response;
  } catch (error) {
    if (
      error instanceof AppBusinessError &&
      error.code === STORY_1011_ACTIVITY_ENDED_CODE
    ) {
      if (reloadPageForActivityEnded(activityId)) {
        // 页面即将卸载；挂起 Promise，避免 React Query 把业务结束态当失败 retry
        return new Promise(() => {});
      }
    }

    throw error;
  }
}
