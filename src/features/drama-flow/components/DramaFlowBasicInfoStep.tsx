import { zodResolver } from '@hookform/resolvers/zod';
import type { TFunction } from 'i18next';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Resolver } from 'react-hook-form';
import { useForm, useFormState, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { z } from 'zod';
import type { DramaTagItemResponse } from '@/api/__generated__/story/model/dramaTagItemResponse';
import {
  getListPublicTagsQueryKey,
  useListPublicTags,
} from '@/api/__generated__/story/public-drama/public-drama';
import IconCoverUpload from '@/assets/svg/IconCoverUpload';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { extractStoryInnerData } from '@/features/create-actor/uploadCreatorActorAvatar';
import { DramaFlowStepCard } from '@/features/drama-flow/components/DramaFlowStepCard';
import type { DramaFlowMode } from '@/features/drama-flow/contexts/DramaFlowConfigContext';
import { useDramaFlowConfig } from '@/features/drama-flow/contexts/DramaFlowConfigContext';
import { useDramaFlowStore } from '@/features/drama-flow/hooks/useDramaFlowStore';
import type { DramaFlowDocument } from '@/features/drama-flow/types/dramaFlowDocument';
import {
  isObjectKeyMatchedUploadSession,
  uploadCreateDramaFile,
} from '@/features/drama-flow/utils/uploadDramaFlowFile';
import { buildMiniDramaPublicObjectUrl, cn } from '@/utils';

const MAX_COVER_BYTES = 5 * 1024 * 1024;
const MAX_TAG_SELECTION = 5;
const TITLE_MAX_LENGTH = 200;
const DESCRIPTION_MAX_LENGTH = 1000;

const FOOTER_BUTTON_BASE_CLASS_NAME = cn(
  'h-auto min-w-0 flex-1 rounded-xl px-6 py-2.5',
  'text-sm leading-5 font-bold',
  'md:flex-none',
);

/** 随语言切换与接口标签列表重建 resolver，保证校验文案走 i18n。 */
function buildCreateFirstBasicInfoSchema(
  t: TFunction,
  allowedTagIds: readonly string[],
  mode: DramaFlowMode,
) {
  const allowed = new Set(allowedTagIds);

  return z.object({
    title: z
      .string()
      .trim()
      .min(1, { message: t('请输入短剧标题') })
      .max(TITLE_MAX_LENGTH, { message: t('短剧标题不超过200字') }),
    description: z
      .string()
      .trim()
      .min(1, { message: t('请输入简介') })
      .max(DESCRIPTION_MAX_LENGTH, { message: t('简介不超过1000字') }),
    coverObjectKey:
      mode === 'create'
        ? z.string().min(1, { message: t('请上传横版封面') })
        : z.string().optional(),
    bannerObjectKey: z.string().optional(),
    tagIds: z
      .array(z.string())
      .min(1, { message: t('请选择一个标签') })
      .max(MAX_TAG_SELECTION, { message: t('最多选择5个标签') })
      .refine((arr) => arr.every((n) => allowed.has(n)), {
        message: t('请选择有效的标签'),
      }),
  });
}

type CreateFirstBasicInfoValues = z.infer<
  ReturnType<typeof buildCreateFirstBasicInfoSchema>
>;

type FormModel = {
  title: string;
  description: string;
  coverObjectKey?: string;
  bannerObjectKey?: string;
  tagIds: string[];
};

function buildBasicInfoPatchFromFormValues(
  values: FormModel,
  uploadSessionId: number | undefined,
) {
  const matchedCoverObjectKey =
    values.coverObjectKey &&
    isObjectKeyMatchedUploadSession(values.coverObjectKey, uploadSessionId)
      ? values.coverObjectKey
      : undefined;
  const matchedBannerObjectKey =
    values.bannerObjectKey &&
    isObjectKeyMatchedUploadSession(values.bannerObjectKey, uploadSessionId)
      ? values.bannerObjectKey
      : undefined;

  return {
    title: values.title,
    description: values.description,
    ...(matchedCoverObjectKey ? { coverObjectKey: matchedCoverObjectKey } : {}),
    ...(matchedBannerObjectKey
      ? { bannerObjectKey: matchedBannerObjectKey }
      : {}),
    tagIds: values.tagIds,
  };
}

const EMPTY_PUBLIC_TAG_OPTIONS: (DramaTagItemResponse & { id: string })[] = [];

function selectPublicTags(
  response: unknown,
): (DramaTagItemResponse & { id: string })[] {
  const raw = extractStoryInnerData<DramaTagItemResponse[]>(
    response as { status: number; data: unknown },
  );
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((x) => ({
      ...x,
      id: String(x.id),
    }))
    .filter(
      (x): x is DramaTagItemResponse & { id: string } =>
        typeof x.id === 'string' && x.id.trim().length > 0,
    );
}

type CreateFirstIndexProps = {
  onGoToStep: (step: 1 | 2 | 3) => void;
};

export function DramaFlowBasicInfoStep({ onGoToStep }: CreateFirstIndexProps) {
  const hasHydrated = useDramaFlowStore((s) => s.hasHydrated);

  if (!hasHydrated) {
    return (
      <div
        className={cn(
          'flex min-h-48 w-full items-center justify-center',
          'rounded-3xl bg-card',
        )}
      >
        <Spinner className="size-8 text-muted-foreground" />
      </div>
    );
  }

  return <DramaFlowBasicInfoStepForm onGoToStep={onGoToStep} />;
}

function buildBasicInfoFormValuesFromDocument(
  document: DramaFlowDocument,
): FormModel {
  const coverObjectKey = document.coverObjectKey ?? '';
  const bannerObjectKey = document.bannerObjectKey ?? coverObjectKey;

  return {
    title: document.title ?? '',
    description: document.description ?? '',
    coverObjectKey,
    bannerObjectKey,
    tagIds: (document.tagIds ?? []).map((id) => String(id)),
  };
}

function DramaFlowBasicInfoStepForm({ onGoToStep }: CreateFirstIndexProps) {
  const { t, i18n } = useTranslation();
  const { mode } = useDramaFlowConfig();
  const isEditMode = mode === 'edit';

  const {
    data: dataTags,
    isLoading: isLoadingTags,
    isError: isErrorTags,
  } = useListPublicTags({
    query: {
      // 语言切换须重新拉取：后端按 Accept-Language 返回本地化标签名
      queryKey: [...getListPublicTagsQueryKey(), i18n.language] as const,
      select: selectPublicTags,
    },
  });
  const tagOptions = dataTags ?? EMPTY_PUBLIC_TAG_OPTIONS;
  const allowedTagIds = useMemo(
    () => tagOptions.map((o) => o.id),
    [tagOptions],
  );

  const coverInputRef = useRef<HTMLInputElement>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [isCoverUploading, setIsCoverUploading] = useState(false);

  const document = useDramaFlowStore((s) => s.document);
  const patchDocument = useDramaFlowStore((s) => s.patchDocument);

  const validationSchema = useMemo(
    () => buildCreateFirstBasicInfoSchema(t, allowedTagIds, mode),
    [t, allowedTagIds, mode],
  );

  const resolver = useMemo(
    () =>
      zodResolver(validationSchema) as Resolver<
        FormModel,
        unknown,
        CreateFirstBasicInfoValues
      >,
    [validationSchema],
  );

  const form = useForm<FormModel, unknown, CreateFirstBasicInfoValues>({
    resolver,
    defaultValues: buildBasicInfoFormValuesFromDocument(document),
    mode: 'onSubmit',
  });

  const selectedTagIdStrings = useWatch({
    control: form.control,
    name: 'tagIds',
  });
  const { isSubmitted: isBasicInfoSubmitted } = useFormState({
    control: form.control,
  });
  const coverObjectKey = useWatch({
    control: form.control,
    name: 'coverObjectKey',
  });

  // 标签列表就绪后剔除不在当前选项内的 id，避免表单内残留与 chip 展示不一致导致首次点击被当成「取消选中」。
  useEffect(() => {
    if (allowedTagIds.length === 0) {
      return;
    }

    const allowed = new Set<string>(allowedTagIds);
    const current: string[] = form.getValues('tagIds') ?? [];
    const sanitized = current.filter((id) => allowed.has(id));

    if (sanitized.length !== current.length) {
      form.setValue('tagIds', sanitized, { shouldDirty: true });
      if (sanitized.length > 0) {
        form.clearErrors('tagIds');
      }
    }
  }, [allowedTagIds, form]);

  const coverPublicUrl = useMemo(
    () => buildMiniDramaPublicObjectUrl(coverObjectKey),
    [coverObjectKey],
  );
  const isMediaUploading = isCoverUploading;

  // 点击左侧主槽时唤起横版封面选择，仅接受 JPG/PNG。
  const handleOpenCoverPicker = () => {
    coverInputRef.current?.click();
  };

  // 统一的上传处理函数
  const uploadCoverImage = (file: File | undefined) => {
    if (!file) return;

    if (file.size > MAX_COVER_BYTES) {
      toast.error(t('图片不超过 5MB'));
      return;
    }

    if (!document.uploadSessionId) {
      throw new Error('上传 Session 未初始化');
    }

    const nextUrl = URL.createObjectURL(file);
    setCoverPreviewUrl(nextUrl);
    setIsCoverUploading(true);

    return uploadCreateDramaFile(file, 'cover', document.uploadSessionId)
      .then(({ objectKey, uploadSessionId }) => {
        // 当前流程仅保留横版上传入口，cover/banner 始终写入同一 objectKey。
        patchDocument({ uploadSessionId });
        form.setValue('coverObjectKey', objectKey, { shouldValidate: true });
        form.setValue('bannerObjectKey', objectKey, { shouldValidate: true });
      })
      .finally(() => {
        setIsCoverUploading(false);
      });
  };

  // 用户选定封面文件后上传
  const handleCoverFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    void uploadCoverImage(file);
  };

  // 用户点击某一标签 chip 时切换选中状态；校验仅在提交时触发，选中后清除历史错误。
  const handleSelectTag = (tagId: string) => () => {
    const currentTagIdStrings = selectedTagIdStrings ?? [];
    const isSelected = currentTagIdStrings.includes(tagId);

    if (!isSelected && currentTagIdStrings.length >= MAX_TAG_SELECTION) {
      toast.error(t('最多选择5个标签'));
      return;
    }

    const newTagIdStrings = isSelected
      ? currentTagIdStrings.filter((id) => id !== tagId)
      : [...currentTagIdStrings, tagId];

    form.setValue('tagIds', newTagIdStrings, { shouldDirty: true });

    if (newTagIdStrings.length > 0) {
      form.clearErrors('tagIds');
    }
  };

  // 将当前可序列化字段写入 createDramaStore（persist → localStorage）。
  const handleSaveDraft = () => {
    if (
      form.getValues('coverObjectKey') &&
      !isObjectKeyMatchedUploadSession(
        form.getValues('coverObjectKey'),
        document.uploadSessionId,
      )
    ) {
      toast.error(t('封面或海报上传会话异常，请重新上传'));
      return;
    }

    const values = form.getValues();
    patchDocument(
      buildBasicInfoPatchFromFormValues(values, document.uploadSessionId),
    );
    toast.success(t('草稿已保存'));
  };

  // 校验通过后写入草稿（persist 落盘）并进入「剧集管理」步骤；与「保存草稿」共用写入逻辑，保证返回上一步可回显。
  const handleSubmitValid = (data: CreateFirstBasicInfoValues) => {
    if (
      data.coverObjectKey &&
      !isObjectKeyMatchedUploadSession(
        data.coverObjectKey,
        document.uploadSessionId,
      )
    ) {
      toast.error(t('封面或海报上传会话异常，请重新上传'));
      return;
    }

    patchDocument(
      buildBasicInfoPatchFromFormValues(
        data as FormModel,
        document.uploadSessionId,
      ),
    );
    onGoToStep(2);
  };

  return (
    <Form {...form}>
      <form
        className="flex w-full flex-col"
        onSubmit={form.handleSubmit(handleSubmitValid)}
      >
        <DramaFlowStepCard currentStep={1}>
          <div className={cn('flex w-full flex-col', 'gap-4')}>
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem className="gap-3">
                  <FormLabel
                    className={cn(
                      'text-base leading-6 font-bold text-foreground',
                      'md:text-base',
                    )}
                  >
                    {t('短剧标题')}
                  </FormLabel>
                  <FormControl>
                    <div className="relative w-full">
                      <Input
                        placeholder={t('输入短剧标题')}
                        maxLength={TITLE_MAX_LENGTH}
                        disabled={isEditMode}
                        className={cn(
                          'h-auto min-h-12 rounded-2xl border-create-flow-input-border bg-create-flow-input-surface',
                          'px-4 py-3 pr-16',
                          'text-[15px] leading-[22px] text-foreground placeholder:text-muted-foreground',
                        )}
                        autoComplete="off"
                        {...field}
                      />
                      <span
                        className={cn(
                          'pointer-events-none absolute top-1/2 right-4 -translate-y-1/2',
                          'text-xs leading-4 tracking-[0.04px] text-muted-foreground',
                        )}
                      >
                        {field.value.length}/{TITLE_MAX_LENGTH}
                      </span>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="min-w-0 gap-3">
                  <FormLabel
                    className={cn(
                      'text-base leading-6 font-bold text-foreground',
                    )}
                  >
                    {t('简介')}
                  </FormLabel>
                  <FormControl>
                    <div className="relative min-w-0 w-full">
                      <Textarea
                        placeholder={t('讲述一个什么样的故事...')}
                        maxLength={DESCRIPTION_MAX_LENGTH}
                        rows={4}
                        className={cn(
                          'min-h-[120px] min-w-0 w-full break-words rounded-2xl border-create-flow-input-border bg-create-flow-input-surface',
                          'field-sizing-fixed',
                          'px-4 py-4 pr-16',
                          'text-[15px] leading-[22px] text-foreground placeholder:text-muted-foreground',
                          'md:min-h-[148px]',
                        )}
                        {...field}
                      />
                      <span
                        className={cn(
                          'pointer-events-none absolute right-4 bottom-4',
                          'text-xs leading-4 tracking-[0.04px] text-muted-foreground',
                        )}
                      >
                        {field.value.length}/{DESCRIPTION_MAX_LENGTH}
                      </span>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="coverObjectKey"
              render={() => (
                <FormItem
                  className={cn(
                    // Figma 2086:17508 — space-y-3：标签区与上传区纵向 12px
                    'flex flex-col gap-3',
                  )}
                >
                  <FormLabel
                    className={cn(
                      // Typography — Typography/4/Bold
                      'text-base leading-6 font-bold tracking-normal text-foreground',
                    )}
                  >
                    {t('封面')}
                  </FormLabel>

                  <div
                    className={cn(
                      // Layout — 横向间距与垂直居中；窄屏纵向堆叠
                      'flex w-full min-w-0 flex-col gap-3',
                      'md:flex-row md:items-center',
                    )}
                  >
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isCoverUploading}
                      onClick={handleOpenCoverPicker}
                      className={cn(
                        // Layout & Sizing — Figma 148×197
                        'relative flex h-[197px] w-[148px] max-w-full shrink-0 flex-col items-center justify-center overflow-hidden p-0',
                        // Visual — Figma rounded-16、thirdly 面 + tertiary 边
                        'rounded-2xl border border-create-flow-input-border bg-create-flow-input-surface',
                        // State
                        'hover:bg-create-flow-input-surface',
                        'disabled:pointer-events-none disabled:opacity-70',
                      )}
                    >
                      {isCoverUploading ? (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/40">
                          <Spinner className="size-6 text-create-flow-accent" />
                        </div>
                      ) : null}
                      {coverPreviewUrl ? (
                        <img
                          src={coverPreviewUrl}
                          alt=""
                          className={cn(
                            'absolute inset-0 size-full object-cover',
                          )}
                        />
                      ) : coverPublicUrl ? (
                        <img
                          src={coverPublicUrl}
                          alt=""
                          className={cn(
                            'absolute inset-0 size-full object-cover',
                          )}
                        />
                      ) : document.originalCoverUrl ? (
                        <img
                          src={document.originalCoverUrl}
                          alt=""
                          className={cn(
                            'absolute inset-0 size-full object-cover',
                          )}
                        />
                      ) : coverObjectKey ? (
                        <span className="text-sm font-medium text-foreground">
                          {t('已上传')}
                        </span>
                      ) : (
                        <IconCoverUpload className="size-10 text-muted-foreground" />
                      )}
                    </Button>

                    <div
                      className={cn(
                        // Figma 2086:17518 — 右列 flex-col gap-12 items-start justify-center
                        'flex min-h-0 w-full min-w-0 flex-col items-start justify-center gap-3',
                        'md:w-auto md:min-h-[197px]',
                      )}
                    >
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isCoverUploading}
                        onClick={handleOpenCoverPicker}
                        className={cn(
                          'inline-flex h-auto shrink-0 items-center justify-center',
                          'px-6 py-2.5',
                          'rounded-xl border-[1.5px] border-border bg-background',
                          'text-sm leading-5 font-bold text-foreground',
                          'hover:bg-muted',
                        )}
                      >
                        {t('上传')}
                      </Button>
                      <p
                        className={cn(
                          'font-mono text-sm leading-5 font-normal text-foreground',
                          'max-w-[270px] whitespace-normal md:max-w-none md:whitespace-nowrap',
                        )}
                      >
                        {t('支持 JPG/PNG，不超过 5MB')}
                      </p>
                    </div>
                  </div>
                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/jpeg,image/png"
                    className="sr-only"
                    onChange={handleCoverFileChange}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tagIds"
              render={() => (
                <FormItem className="gap-3">
                  <FormLabel
                    className={cn(
                      'text-base leading-6 font-bold text-foreground',
                    )}
                  >
                    {t('标签')}
                  </FormLabel>
                  <div className="flex flex-wrap gap-1.5">
                    {isLoadingTags ? (
                      <p
                        className={cn(
                          'text-sm leading-5 text-muted-foreground',
                        )}
                      >
                        {t('加载中')}
                      </p>
                    ) : isErrorTags ? (
                      <p className={cn('text-sm leading-5 text-destructive')}>
                        {t('加载失败')}
                      </p>
                    ) : tagOptions.length === 0 ? (
                      <p
                        className={cn(
                          'text-sm leading-5 text-muted-foreground',
                        )}
                      >
                        {t('暂无标签')}
                      </p>
                    ) : (
                      tagOptions.map((opt) => {
                        const selected =
                          selectedTagIdStrings?.includes(opt.id) ?? false;
                        const atTagLimit =
                          (selectedTagIdStrings?.length ?? 0) >=
                          MAX_TAG_SELECTION;
                        const label =
                          (opt.name ?? opt.code ?? String(opt.id)).trim() ||
                          String(opt.id);

                        return (
                          <Button
                            key={opt.id}
                            type="button"
                            role="checkbox"
                            aria-checked={selected}
                            disabled={!selected && atTagLimit}
                            variant={selected ? 'default' : 'outline'}
                            size="sm"
                            onClick={handleSelectTag(opt.id)}
                            className={cn(
                              'h-9 rounded-[37px] px-3.5',
                              'text-sm font-medium',
                              selected
                                ? 'border-foreground bg-foreground text-background hover:bg-foreground/90'
                                : 'border-border bg-background text-foreground hover:bg-muted',
                            )}
                          >
                            {label}
                          </Button>
                        );
                      })
                    )}
                  </div>
                  {isBasicInfoSubmitted ? <FormMessage /> : null}
                </FormItem>
              )}
            />
          </div>

          <footer
            className={cn(
              'flex w-full flex-row items-stretch gap-3',
              'md:items-center md:justify-end',
            )}
          >
            {isEditMode ? null : (
              <Button
                type="button"
                variant="outline"
                onClick={handleSaveDraft}
                className={cn(
                  FOOTER_BUTTON_BASE_CLASS_NAME,
                  'border-[1.5px] border-border text-foreground',
                )}
              >
                {t('保存草稿')}
              </Button>
            )}
            <Button
              type="submit"
              variant="ghost"
              disabled={isMediaUploading}
              className={cn(
                FOOTER_BUTTON_BASE_CLASS_NAME,
                isMediaUploading
                  ? [
                      'cursor-not-allowed border-transparent',
                      'bg-button-disabled-surface text-button-disabled-on-surface',
                      'hover:bg-button-disabled-surface hover:text-button-disabled-on-surface',
                      'disabled:bg-button-disabled-surface disabled:text-button-disabled-on-surface',
                      'disabled:opacity-100',
                    ]
                  : [
                      'border-foreground bg-foreground text-background',
                      'hover:bg-foreground/90 hover:text-background',
                    ],
              )}
            >
              {t('下一步')}
            </Button>
          </footer>
        </DramaFlowStepCard>
      </form>
    </Form>
  );
}
