import type { ChangeEvent, RefObject } from 'react';
import { useTranslation } from 'react-i18next';

import IconStoryCheckinUpload from '@/assets/svg/IconStoryCheckinUpload';
import IconX from '@/assets/svg/IconX';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { GameDialogSubmitLabel } from '@/features/game/components/GameDialogSubmitLabel';
import { cn } from '@/utils';

import {
  STORY_1011_CONTENT_MAX,
  STORY_1011_IMAGE_ACCEPT,
} from '../constants/story1011Constants';
import { getStory1011AccentSubmitButtonVisualClassName } from '../utils/story1011AccentSubmitButton';

/** Figma 7026:35793 — 已选图预览固定边长；空态上传区用 min-h 随文案换行增高 */
const STORY_1011_IMAGE_SLOT_SIZE_CLASS = 'size-34';
const STORY_1011_UPLOAD_SLOT_MIN_HEIGHT_CLASS = 'min-h-34';

/** Figma 7064:82326 / 7026:35750 — 未开始 / 已结束提交按钮共用底与边框 */
const STORY_1011_FORM_LOCKED_SUBMIT_BUTTON_CLASS = cn(
  'h-11 w-full rounded border border-story-checkin-border-secondary bg-story-checkin-input px-4 py-2.5',
  'text-sm leading-5 font-bold',
  'disabled:opacity-100 disabled:border-story-checkin-border-secondary',
);

type Story1011FormProps = {
  content: string;
  imagePreviewUrl: string | undefined;
  isSubmitting: boolean;
  /** 活动未开始：表单项置灰，提交按钮为敬请期待态 */
  isActivityNotStarted: boolean;
  /** 活动已结束：表单项置灰与未开始一致，提交按钮为结束文案态 */
  isActivityEnded: boolean;
  /** 活动结束日展示（YYYY.MM.DD），已结束按钮文案用 */
  activityEndDateLabel: string | undefined;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onContentChange: (value: string) => void;
  onPickImage: () => void;
  onImageChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onClearImage: () => void;
  onSubmit: () => void;
};

export function Story1011Form({
  content,
  imagePreviewUrl,
  isSubmitting,
  isActivityNotStarted,
  isActivityEnded,
  activityEndDateLabel,
  fileInputRef,
  onContentChange,
  onPickImage,
  onImageChange,
  onClearImage,
  onSubmit,
}: Story1011FormProps) {
  const { t } = useTranslation();
  const isFormLocked = isActivityNotStarted || isActivityEnded;
  const isFormDisabled = isSubmitting || isFormLocked;

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex w-full flex-col gap-3">
        <label
          htmlFor="story-1011-content"
          className={cn(
            'text-base leading-6 font-bold',
            isFormLocked ? 'text-muted-foreground' : 'text-foreground',
          )}
        >
          {t('你的 1011 故事')}
        </label>
        <Textarea
          id="story-1011-content"
          value={content}
          maxLength={STORY_1011_CONTENT_MAX}
          disabled={isFormDisabled}
          placeholder={t('那天，我看见···市场崩溃的瞬间，我的仓位···')}
          onChange={(event) => onContentChange(event.target.value)}
          className={cn(
            // Layout & Positioning
            // 移动端占位折两行：py-4(32) + leading-5×2(40) = 72；md 起仍为单行 52
            'min-h-[72px] w-full resize-y md:min-h-[52px]',
            // Sizing & Spacing
            'rounded px-4 py-4',
            // Visuals & Typography
            'border border-foreground bg-story-checkin-input text-sm leading-5',
            'placeholder:text-muted-foreground',
            // Interactions & States
            'focus-visible:border-foreground focus-visible:ring-0',
            'disabled:cursor-not-allowed disabled:opacity-60',
          )}
        />
      </div>

      <div className="flex w-full flex-col gap-3">
        <p
          className={cn(
            'm-0 text-base leading-6 font-bold',
            isFormLocked ? 'text-muted-foreground' : 'text-foreground',
          )}
        >
          {t('上传图片（选填）')}
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept={STORY_1011_IMAGE_ACCEPT}
          className="hidden"
          disabled={isFormDisabled}
          onChange={onImageChange}
        />

        {imagePreviewUrl ? (
          <div
            className={cn(
              // Layout & Positioning
              'relative shrink-0 overflow-hidden',
              // Sizing & Spacing
              STORY_1011_IMAGE_SLOT_SIZE_CLASS,
              'rounded',
              isFormLocked && 'opacity-60',
            )}
          >
            <img
              src={imagePreviewUrl}
              alt=""
              className="absolute inset-0 size-full object-cover"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={isFormDisabled}
              aria-label={t('清除')}
              onClick={onClearImage}
              className={cn(
                // Layout & Positioning
                'absolute top-1 right-1',
                // Sizing & Spacing
                'size-6 rounded-full p-0',
                // Visuals & Typography
                'bg-story-checkin-input text-foreground',
                // Interactions & States
                'hover:bg-story-checkin-input hover:opacity-90 disabled:opacity-60',
              )}
            >
              <IconX className="size-3.5" />
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="ghost"
            disabled={isFormDisabled}
            onClick={onPickImage}
            className={cn(
              // Layout & Positioning
              'flex h-auto w-full flex-col items-center justify-center gap-2.5',
              // Sizing & Spacing — Figma 6962:37731 / 7026:35646；min-h 保桌面稿高，文案换行时增高
              STORY_1011_UPLOAD_SLOT_MIN_HEIGHT_CLASS,
              'rounded border border-dashed border-foreground p-6',
              // Visuals & Typography — 覆盖 Button 默认 nowrap，提示文案可换行
              'whitespace-normal bg-story-checkin-input text-story-checkin-upload-fg',
              // Interactions & States
              'hover:bg-story-checkin-input hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60',
            )}
          >
            <IconStoryCheckinUpload className="size-6 shrink-0 text-story-checkin-upload-fg" />
            <span className="w-full text-center text-base leading-6 font-medium wrap-break-word text-story-checkin-upload-fg">
              {t('点击上传图片')}
            </span>
            <span className="w-full text-center text-sm leading-5 font-normal wrap-break-word text-story-checkin-upload-hint">
              {t('支持 JPG、PNG、WebP 格式，不超过 5MB')}
            </span>
          </Button>
        )}
      </div>

      {isActivityNotStarted ? (
        <Button
          type="button"
          disabled
          className={cn(
            STORY_1011_FORM_LOCKED_SUBMIT_BUTTON_CLASS,
            'text-story-checkin-accent disabled:text-story-checkin-accent',
          )}
        >
          {t('活动尚未开始，敬请期待')}
        </Button>
      ) : null}

      {isActivityEnded && !isActivityNotStarted ? (
        // Figma 7026:35750 — 已结束态：与未开始同底/边框，错误色文案
        <Button
          type="button"
          disabled
          className={cn(
            STORY_1011_FORM_LOCKED_SUBMIT_BUTTON_CLASS,
            'text-destructive disabled:text-destructive',
          )}
        >
          {t('活动已于 {{date}} 结束', {
            date: activityEndDateLabel ?? '-',
          })}
        </Button>
      ) : null}

      {!isActivityNotStarted && !isActivityEnded ? (
        <Button
          type="button"
          disabled={isSubmitting}
          onClick={onSubmit}
          className={cn(
            'h-11 w-full rounded px-4',
            'text-sm leading-5 font-bold',
            getStory1011AccentSubmitButtonVisualClassName(isSubmitting),
          )}
        >
          <GameDialogSubmitLabel isPending={isSubmitting} className="gap-1">
            {t('提交故事 · 登船')}
          </GameDialogSubmitLabel>
        </Button>
      ) : null}
    </div>
  );
}
