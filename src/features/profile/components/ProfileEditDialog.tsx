import type { ChangeEvent, KeyboardEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { AppDialog } from '@/components/common/AppDialog';
import {
  APP_DIALOG_PRIMARY_BUTTON_CLASS,
  APP_DIALOG_SECONDARY_BUTTON_CLASS,
} from '@/components/common/appDialogButton';
import { UserProfileAvatar } from '@/components/common/UserProfileAvatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import {
  normalizeProfileBioInput,
  sanitizeProfileBio,
} from '@/features/profile/profileFormat';
import { uploadProfileAvatarFile } from '@/features/profile/uploadProfileAvatar';
import { cn, resolveProfileAvatarUrl } from '@/utils';

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const MAX_DISPLAY_NAME_LENGTH = 64;
const MAX_PROFILE_LENGTH = 200;

type ProfileEditDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDisplayName: string;
  initialProfile?: string;
  /** 当前绑定邮箱；有值时展示只读「邮箱地址」入口（Figma 822:151938） */
  email?: string;
  initialAvatarUrl?: string;
  userId?: string;
  isSaving?: boolean;
  onSave: (payload: {
    nickname: string;
    profile: string;
    avatarUrl?: string;
  }) => void;
};

function revokePreviewBlobIfDisposable(url: string | null | undefined) {
  if (url?.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}

export function ProfileEditDialog({
  open,
  onOpenChange,
  initialDisplayName,
  initialProfile = '',
  email,
  initialAvatarUrl,
  userId,
  isSaving = false,
  onSave,
}: ProfileEditDialogProps) {
  const { t } = useTranslation();
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [profile, setProfile] = useState(initialProfile);
  /** 本弹窗内新选/上传的预览（blob 或上传后的 CDN URL） */
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | undefined>(
    undefined,
  );
  const [pendingAvatarUrl, setPendingAvatarUrl] = useState<string | undefined>(
    undefined,
  );
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emailTrimmed = email?.trim();

  useEffect(() => {
    if (!open) {
      return;
    }

    setDisplayName(initialDisplayName);
    setProfile(sanitizeProfileBio(initialProfile));
    setLocalPreviewUrl(undefined);
    setPendingAvatarUrl(undefined);
  }, [open, initialDisplayName, initialProfile]);

  const handleUploadAvatarClick = () => {
    fileInputRef.current?.click();
  };

  /** 简介输入：去掉换行，避免接口 400 */
  const handleProfileChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setProfile(normalizeProfileBioInput(event.target.value));
  };

  /** 禁止回车换行（接口不认 \n） */
  const handleProfileKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
    }
  };

  const handleAvatarFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    if (file.size > MAX_AVATAR_BYTES) {
      toast.error(t('图片不超过 5MB'));
      return;
    }

    const nextUrl = URL.createObjectURL(file);
    setLocalPreviewUrl((prev) => {
      revokePreviewBlobIfDisposable(prev);
      return nextUrl;
    });
    setPendingAvatarUrl(undefined);
    setIsAvatarUploading(true);

    uploadProfileAvatarFile(file)
      .then((publicUrl) => {
        setPendingAvatarUrl(publicUrl);
        setLocalPreviewUrl((prev) => {
          revokePreviewBlobIfDisposable(prev);
          return publicUrl;
        });
      })
      .finally(() => {
        setIsAvatarUploading(false);
      });
  };

  const handleSave = () => {
    const trimmedName = displayName.trim();
    const trimmedProfile = sanitizeProfileBio(profile);

    if (!trimmedName) {
      toast.error(t('请输入用户名'));
      return;
    }

    if (trimmedName.length > MAX_DISPLAY_NAME_LENGTH) {
      toast.error(t('用户名不超过64字'));
      return;
    }

    if (trimmedProfile.length > MAX_PROFILE_LENGTH) {
      toast.error(t('简介不超过200字'));
      return;
    }

    if (isAvatarUploading) {
      return;
    }

    onSave({
      nickname: trimmedName,
      profile: trimmedProfile,
      avatarUrl: pendingAvatarUrl,
    });
  };

  const previewSrc =
    localPreviewUrl ?? resolveProfileAvatarUrl(initialAvatarUrl);

  const isSubmitting = isSaving || isAvatarUploading;

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('编辑')}
      width={424}
      bodyScroll
    >
      <div className="flex w-full flex-col gap-4">
        <div className="flex flex-col items-center gap-3">
          <div
            className={cn(
              'relative flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-full',
              'border border-border bg-muted',
            )}
          >
            {previewSrc ? (
              <img
                alt=""
                src={previewSrc}
                className={cn(
                  'absolute inset-0 size-full rounded-full object-cover',
                )}
              />
            ) : (
              <UserProfileAvatar
                userId={userId}
                avatarUrl={initialAvatarUrl}
                size={96}
                alt={displayName}
                className="size-full"
              />
            )}
            {isAvatarUploading ? (
              <div
                className={cn(
                  'absolute inset-0 flex items-center justify-center rounded-full bg-black/40',
                )}
              >
                <Spinner className="size-8 text-white" />
              </div>
            ) : null}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/svg+xml"
            className="sr-only"
            onChange={handleAvatarFileChange}
          />
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={handleUploadAvatarClick}
            className={cn(
              'h-auto rounded-full border-border bg-muted px-6 py-2',
              'text-sm leading-5 font-bold text-foreground',
            )}
          >
            {t('上传头像')}
          </Button>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label
            htmlFor="profile-edit-display-name"
            className="text-sm leading-5 font-bold text-foreground"
          >
            {t('用户名')}
          </Label>
          <div
            className={cn(
              'flex min-h-12 items-center gap-2.5 rounded-2xl border border-border bg-muted px-4 py-3',
            )}
          >
            <Input
              id="profile-edit-display-name"
              value={displayName}
              maxLength={MAX_DISPLAY_NAME_LENGTH}
              onChange={(e) => setDisplayName(e.target.value)}
              className={cn(
                'h-auto min-h-0 flex-1 border-0 p-0',
                // Edge 兼容：与外层同色，避免透明控件露出默认底色
                'rounded-none bg-muted appearance-none shadow-none dark:bg-muted',
                'text-sm text-foreground focus-visible:ring-0',
              )}
            />
            <span className="shrink-0 text-xs leading-4 tracking-[0.04px] text-muted-foreground">
              {displayName.length}/{MAX_DISPLAY_NAME_LENGTH}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label
            htmlFor="profile-edit-bio"
            className="text-sm leading-5 font-bold text-foreground"
          >
            {t('简介')}
          </Label>
          <div
            className={cn(
              'flex min-h-24 items-end gap-2.5 rounded-2xl border border-border bg-muted p-4',
            )}
          >
            <Textarea
              id="profile-edit-bio"
              value={profile}
              maxLength={MAX_PROFILE_LENGTH}
              placeholder={t('请输入简介')}
              rows={4}
              onChange={handleProfileChange}
              onKeyDown={handleProfileKeyDown}
              className={cn(
                // Layout — 撑满外层，避免 Edge 下 field-sizing-content 缩成小灰块
                'min-h-[88px] w-full flex-1 resize-none border-0 p-0',
                'field-sizing-fixed rounded-none',
                // Visual — Edge 对 textarea 透明底色仍会画默认灰底，与外层 bg-muted 对齐
                'bg-muted appearance-none shadow-none outline-none dark:bg-muted',
                'text-sm leading-5 text-foreground focus-visible:ring-0',
              )}
            />
            <span className="shrink-0 text-xs leading-4 tracking-[0.04px] text-muted-foreground">
              {profile.length}/{MAX_PROFILE_LENGTH}
            </span>
          </div>
        </div>

        {/* Figma 822:151933 — 邮箱地址只读入口 */}
        {emailTrimmed ? (
          <div className="flex w-full min-w-0 flex-col gap-2">
            <p className="m-0 text-sm leading-5 font-bold text-foreground">
              {t('邮箱地址')}
            </p>
            <p
              title={emailTrimmed}
              className={cn(
                'm-0 min-w-0 truncate text-sm leading-5 font-normal',
                'text-foreground',
              )}
            >
              {emailTrimmed}
            </p>
          </div>
        ) : null}

        <div className="flex w-full gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => onOpenChange(false)}
            className={APP_DIALOG_SECONDARY_BUTTON_CLASS}
          >
            {t('取消')}
          </Button>
          <Button
            type="button"
            disabled={isSubmitting}
            onClick={handleSave}
            className={APP_DIALOG_PRIMARY_BUTTON_CLASS}
          >
            {isSubmitting ? <Spinner className="size-5" /> : t('保存')}
          </Button>
        </div>
      </div>
    </AppDialog>
  );
}
