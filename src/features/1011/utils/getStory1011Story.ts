import {
  getGetStoryUrl,
  type getStoryResponse,
} from '@/api/__generated__/wallet/story-checkin/story-checkin';
import { AppBusinessError, appAxiosInstance } from '@/api/appRequest';
import { STORY_1011_STORY_NOT_EXISTS_CODE } from '../constants/story1011Constants';

/**
 * 查询活动故事。
 * 1200010（尚未提交）静默 toast，并归一为成功空态（等价旧协议 storyId === null），
 * 避免 React Query 把业务空态当失败而自动 retry。
 */
export async function getStory1011Story(
  activityId: number,
  options?: RequestInit,
): Promise<getStoryResponse> {
  try {
    return await appAxiosInstance<getStoryResponse>(
      getGetStoryUrl(activityId),
      {
        ...options,
        method: 'GET',
      },
      { silentBusinessCodes: [STORY_1011_STORY_NOT_EXISTS_CODE] },
    );
  } catch (error) {
    if (
      error instanceof AppBusinessError &&
      error.code === STORY_1011_STORY_NOT_EXISTS_CODE
    ) {
      // 与 appAxiosInstance 成功态同形：外层 data 为 BaseResponse，内层 data 为业务体
      return {
        data: {
          code: 100000,
          data: { storyId: null },
        },
        status: 200,
        headers: new Headers(),
      } as getStoryResponse;
    }

    throw error;
  }
}
