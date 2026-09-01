/**
 * GET /api/activity/{id}/stories：用户尚未提交故事时的业务码。
 * 须静默 toast，并按「未提交」展示表单（兼容旧协议 storyId === null）。
 */
export const STORY_1011_STORY_NOT_EXISTS_CODE = 1200010;

/**
 * GET /api/activity/activities/{id}/tasks：活动已结束时的业务码。
 * 须静默 toast，并刷新页面以切到结束态 UI。
 */
export const STORY_1011_ACTIVITY_ENDED_CODE = 110203;

/** 故事正文长度（与 SubmitStoryRequest 一致） */
export const STORY_1011_CONTENT_MIN = 1;
export const STORY_1011_CONTENT_MAX = 1000;

export const STORY_1011_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp';

/** 故事配图大小上限（5MB） */
export const STORY_1011_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

/** 排行榜侧栏列表固定可视数据行数（与 Story1011LeaderboardTable 行高一致） */
export const STORY_1011_LEADERBOARD_VISIBLE_ROWS = 10;

/** 表头：text-xs leading-4 + pb-3 */
export const STORY_1011_LEADERBOARD_TABLE_HEADER_HEIGHT_PX = 28;

/** 数据行：py-1.5 + leading-[22px] */
export const STORY_1011_LEADERBOARD_TABLE_ROW_HEIGHT_PX = 34;

export const STORY_1011_LEADERBOARD_LIST_BODY_HEIGHT_PX =
  STORY_1011_LEADERBOARD_VISIBLE_ROWS *
  STORY_1011_LEADERBOARD_TABLE_ROW_HEIGHT_PX;

export const STORY_1011_LEADERBOARD_LIST_VIEWPORT_HEIGHT_PX =
  STORY_1011_LEADERBOARD_TABLE_HEADER_HEIGHT_PX +
  STORY_1011_LEADERBOARD_LIST_BODY_HEIGHT_PX;
