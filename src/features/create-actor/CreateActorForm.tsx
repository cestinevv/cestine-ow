/**
 * 创建角色 — 创建模式发行角色 IP；编辑模式保留角色资料编辑。
 */

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import type { TFunction } from 'i18next';
import type { ChangeEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Resolver } from 'react-hook-form';
import { useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { z } from 'zod';
import {
  getListActorCollectionsQueryKey,
  getListAssetsQueryKey,
  useListAssets,
  useMintActorCollection,
  usePrepareActorCollection,
} from '@/api/__generated__/story/actor-i-p/actor-i-p';
import type { ActorCollectionMintDigestResponse } from '@/api/__generated__/story/model/actorCollectionMintDigestResponse';
import type { AssetInfoDto } from '@/api/__generated__/story/model/assetInfoDto';
import type { MintActorCollectionRequest } from '@/api/__generated__/story/model/mintActorCollectionRequest';
import { MintActorCollectionRequestPayMethod } from '@/api/__generated__/story/model/mintActorCollectionRequestPayMethod';
import { PrepareActorCollectionRequestPricingMode } from '@/api/__generated__/story/model/prepareActorCollectionRequestPricingMode';
import type { PrepareActorCollectionResponse } from '@/api/__generated__/story/model/prepareActorCollectionResponse';
import { appAxiosInstance } from '@/api/appRequest';
import roleFormAvatarPlaceholder from '@/assets/image/create-flow/role-form-avatar-placeholder.svg';
import IconArrowRight from '@/assets/svg/IconArrowRight';
import IconChevronDown from '@/assets/svg/IconChevronDown';
import IconCircleCheck from '@/assets/svg/IconCircleCheck';
import IconNoData from '@/assets/svg/IconNoData';
import IconSearch from '@/assets/svg/IconSearch';
import AppLoadingContainer from '@/components/common/AppLoadingContainer';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { ActorPriceCoefficientTooltip } from '@/features/actor/components/ActorPriceCoefficientTooltip';
import { unwrapOrvalPayload } from '@/features/mining/miningFormat';
import {
  calculateActorPriceCoefficient,
  formatPowerFactor,
} from '@/features/mining/miningPower';
import { DeleteActorConfirmDialog } from '@/features/narrator/components/DeleteActorConfirmDialog';
import { PLAY_CARD_COVER_ASPECT_CLASS } from '@/features/play/playFormat';
import { resolveCreateActorCollectionMintAddress } from '@/hooks/solana/actorCollection/resolveCreateActorCollectionAccounts';
import { notifyDirectWalletSimulationError } from '@/hooks/solana/directWallet';
import {
  resolveCreateActorCollectionOnChainContext,
  useCreateActorCollectionOnChain,
} from '@/hooks/solana/useCreateActorCollectionOnChain';
import { useSponsorCreateActorCollection } from '@/hooks/sponsor/actorCollection/useSponsorCreateActorCollection';
import { getSponsorSubmitErrorMessage } from '@/hooks/sponsor/sponsorSubmitResult';
import { useAppPrivyAccount } from '@/hooks/useAppPrivyAccount';
import { useNotifyInsufficientUsdc } from '@/hooks/useNotifyInsufficientUsdc';
import { getCurrentChain } from '@/solana/chainConfig';
import { useConfigStore } from '@/stores/config';
import useGlobalStore from '@/stores/global';
import {
  cn,
  formatNumber,
  isGreaterThanOrEqual,
  minus,
  multipliedBy,
  readSnowflakeId,
  toNumber,
} from '@/utils';
import {
  buildActorCollectionPrepareCacheKey,
  getCachedActorCollectionId,
  removeCachedActorCollectionId,
  setCachedActorCollectionId,
} from './actorCollectionPrepareCache';
import { CreateActorSuccessDialog } from './CreateActorSuccessDialog';
import { uploadCreatorActorAvatarObject } from './uploadCreatorActorAvatar';

/** 创建角色合集链上发行固定手续费（与稿面「1 USDC」一致） */
const ACTOR_COLLECTION_ISSUE_FEE_USDC = '1';

/** 性别选择值（单一事实来源，与角色编辑接口性别码一致） */
enum CreateActorGender {
  Unspecified = '',
  Male = 'MALE',
  Female = 'FEMALE',
  Unknown = 'UNKNOWN',
}

const GENDER_OPTIONS = [
  { value: CreateActorGender.Male, labelKey: '男' },
  { value: CreateActorGender.Female, labelKey: '女' },
  { value: CreateActorGender.Unknown, labelKey: '其他' },
] as const;

const ACTOR_PRICING_MODE_OPTIONS = [
  {
    value: PrepareActorCollectionRequestPricingMode.FIXED,
    labelKey: '固定价格',
  },
  {
    value: PrepareActorCollectionRequestPricingMode.BONDING_CURVE,
    labelKey: '曲线价格',
  },
] as const;

const POSITIVE_INTEGER_RE = /^[1-9]\d*$/;
const NON_NEGATIVE_INTEGER_RE = /^\d+$/;

/** Mint 价格范围（USDC）：创建角色合集接口要求 [10, 1,000] */
const MINT_PRICE_MIN_USDC = 10;
const MINT_PRICE_MAX_USDC = 1_000;
/** Mint 价格允许的最大小数位数（与 USDC 显示精度一致） */
const MINT_PRICE_MAX_FRACTION_DIGITS = 2;

const DREAM_OS_URL = 'https://www.dreamos.xyz/';

const inputSurfaceClass = cn(
  'w-full min-h-[52px] rounded-2xl border border-create-flow-input-border bg-create-flow-input-surface px-4 py-3.5',
  'text-sm leading-5 text-foreground placeholder:text-muted-foreground',
  'outline-none transition-colors',
  // 与全局 Input 一致：仅换边框色，ring-0 保持 1px
  'focus-visible:border-ring focus-visible:ring-0',
);

const FOOTER_BUTTON_BASE_CLASS_NAME = cn(
  'h-auto min-w-0 flex-1 overflow-hidden rounded-xl px-6 py-2.5',
  'text-sm leading-5 font-bold',
  'md:flex-none',
);

type FormModel = {
  actorName: string;
  bio: string;
  gender: CreateActorGender;
  pricingMode: PrepareActorCollectionRequestPricingMode;
  nftTotalSupply: string;
  mintPriceUsdc: string;
  creatorReserved: string;
  minHoldThreshold: string;
};

type ActorEditResponse = {
  name?: string;
  bio?: string;
  gender?: string;
  avatarUrl?: string;
  creatorReservedQuantity?: number;
  mintQuantity?: number;
  nftMaxSupply?: number;
  nftUnitPrice?: number;
  nftMinHoldThreshold?: number;
};

type UpdateActorRequest = {
  name: string;
  gender: string;
  bio: string;
  creatorReservedQuantity: number;
  mintQuantity: number;
  nftUnitPrice: number;
  nftMinHoldThreshold: number;
  avatarObjectKey?: string;
};

type UpdateActorMutationVariables = {
  actorId: number;
  data: UpdateActorRequest;
};

type DeleteActorMutationVariables = {
  actorId: number;
};

type BasicMutationResponse = {
  status: number;
};

function getGetActorForEditQueryKey(actorId: number) {
  return [`/api/mini-drama/creator/actors/${actorId}/edit`] as const;
}

function getCreatorActorListQueryKey() {
  return [`/api/mini-drama/creator/actors`] as const;
}

function getActorForEdit(
  actorId: number,
  options?: RequestInit,
): Promise<{ data?: ActorEditResponse; status: number }> {
  return appAxiosInstance<{ data?: ActorEditResponse; status: number }>(
    `/api/mini-drama/creator/actors/${actorId}/edit`,
    {
      ...options,
      method: 'GET',
    },
  );
}

function updateActor({
  actorId,
  data,
}: UpdateActorMutationVariables): Promise<BasicMutationResponse> {
  return appAxiosInstance<BasicMutationResponse>(
    `/api/mini-drama/creator/actors/${actorId}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    },
  );
}

function deleteActor({
  actorId,
}: DeleteActorMutationVariables): Promise<BasicMutationResponse> {
  return appAxiosInstance<BasicMutationResponse>(
    `/api/mini-drama/creator/actors/${actorId}`,
    {
      method: 'DELETE',
    },
  );
}

function getConfiguredActorCollectionPayMethod() {
  const payTokenEnv = import.meta.env.VITE_PAY_TOKEN?.toLowerCase();

  if (payTokenEnv === 'usdt') {
    return MintActorCollectionRequestPayMethod.usdt;
  }

  if (payTokenEnv === 'point') {
    return MintActorCollectionRequestPayMethod.point;
  }

  return MintActorCollectionRequestPayMethod.usdc;
}

/** 随语言切换重建 resolver，保证校验文案走 i18n。 */
function buildCreateActorSchema(t: TFunction, isEditMode = false) {
  return z
    .object({
      actorName: z
        .string()
        .trim()
        .min(1, { message: t('请输入角色姓名') })
        .max(20, { message: t('角色姓名不超过20字') }),
      bio: z
        .string()
        .trim()
        .min(1, { message: t('请输入简介') })
        .max(500, { message: t('简介不超过500字') }),
      gender: z
        .nativeEnum(CreateActorGender)
        .refine((value) => value !== CreateActorGender.Unspecified, {
          message: t('请选择性别'),
        }),
      pricingMode: z.nativeEnum(PrepareActorCollectionRequestPricingMode),
      nftTotalSupply: z
        .string()
        .trim()
        .min(1, { message: t('请输入有效的NFT发行总量') })
        .refine((value) => POSITIVE_INTEGER_RE.test(value), {
          message: t('NFT发行总量须为正整数'),
        })
        .refine(
          (value) => {
            if (isEditMode) {
              return true;
            }

            const total = Number(value);
            return total >= 100 && total <= 5000;
          },
          {
            message: t('角色发行总量须在100到5000之间'),
          },
        ),
      creatorReserved: z
        .string()
        .trim()
        .min(1, { message: t('请输入有效的创作者保留数量（至少为1）') })
        .refine((value) => POSITIVE_INTEGER_RE.test(value), {
          message: t('创作者保留数量须为正整数'),
        }),
      mintPriceUsdc: z
        .string()
        .trim()
        .min(1, { message: t('请输入有效的Mint价格') })
        .refine(
          (value) => {
            const num = Number(value);
            return (
              !Number.isNaN(num) &&
              num >= MINT_PRICE_MIN_USDC &&
              num <= MINT_PRICE_MAX_USDC
            );
          },
          { message: t('Mint价格须大于等于10且不超过1,000') },
        )
        .refine(
          (value) => {
            const dotIndex = value.indexOf('.');
            if (dotIndex === -1) {
              return true;
            }
            return (
              value.length - dotIndex - 1 <= MINT_PRICE_MAX_FRACTION_DIGITS
            );
          },
          { message: t('Mint价格最多保留两位小数') },
        ),
      minHoldThreshold: z
        .string()
        .trim()
        .min(1, { message: t('请输入有效的最低持有门槛') })
        .refine((value) => NON_NEGATIVE_INTEGER_RE.test(value), {
          message: t('最低持有门槛须为非负整数'),
        }),
    })
    .superRefine((data, ctx) => {
      const total = Number(data.nftTotalSupply);
      const reserved = Number(data.creatorReserved);

      if (reserved > total) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t('创作者保留数量不能大于发行总量'),
          path: ['creatorReserved'],
        });
      }

      if (total - reserved < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t('开放Mint数量须至少为1，请调整发行总量或创作者保留'),
          path: ['creatorReserved'],
        });
      }
    });
}

type CreateActorFormValues = z.infer<ReturnType<typeof buildCreateActorSchema>>;

const DEFAULT_FORM_VALUES: FormModel = {
  actorName: '',
  bio: '',
  gender: CreateActorGender.Unknown,
  pricingMode: PrepareActorCollectionRequestPricingMode.FIXED,
  nftTotalSupply: '',
  mintPriceUsdc: '',
  creatorReserved: '1',
  minHoldThreshold: '0',
};

function normalizeActorGender(gender: string | undefined): CreateActorGender {
  if (
    gender === CreateActorGender.Male ||
    gender === CreateActorGender.Female ||
    gender === CreateActorGender.Unknown
  ) {
    return gender;
  }

  return CreateActorGender.Unspecified;
}

function toInputValue(value: number | undefined): string {
  return value === undefined || Number.isNaN(value) ? '' : String(value);
}

function buildActorEditFormValues(actor: ActorEditResponse): FormModel {
  const creatorReserved = actor.creatorReservedQuantity;
  const mintQuantity = actor.mintQuantity;
  const nftTotalSupply =
    actor.nftMaxSupply ??
    (creatorReserved !== undefined && mintQuantity !== undefined
      ? creatorReserved + mintQuantity
      : undefined);

  return {
    actorName: actor.name?.trim() ?? '',
    bio: actor.bio?.trim() ?? '',
    gender: normalizeActorGender(actor.gender),
    pricingMode: PrepareActorCollectionRequestPricingMode.BONDING_CURVE,
    nftTotalSupply: toInputValue(nftTotalSupply),
    mintPriceUsdc: toInputValue(actor.nftUnitPrice),
    creatorReserved: toInputValue(creatorReserved),
    minHoldThreshold: toInputValue(actor.nftMinHoldThreshold),
  };
}

function extractDreamActorRows(
  response: { data?: unknown } | undefined,
): AssetInfoDto[] {
  return unwrapOrvalPayload<AssetInfoDto[]>(response) ?? [];
}

function getActorAvatarUrl(actor: AssetInfoDto): string | undefined {
  return actor.assetUrl?.trim() || undefined;
}

function getActorDisplayName(actor: AssetInfoDto): string {
  return actor.assetName?.trim() || 'Luna';
}

function getActorBio(actor: AssetInfoDto): string {
  return actor.assetDescription?.trim() || '';
}

function actorMatchesSearch(actor: AssetInfoDto, keyword: string): boolean {
  const query = keyword.trim().toLowerCase();
  if (!query) {
    return true;
  }

  const id = actor.assetId?.trim() ?? '';
  const name = getActorDisplayName(actor).toLowerCase();
  return name.includes(query) || id.includes(query);
}

/** 过滤为仅含数字的正整数输入草稿。 */
function filterPositiveIntegerInput(raw: string): string {
  const digits = raw.replace(/\D/g, '');

  if (digits === '') {
    return '';
  }

  const n = Number(digits);
  return Number.isNaN(n) ? '' : String(n);
}

/** 过滤为仅含数字的非负整数输入草稿。 */
function filterNonNegativeIntegerInput(raw: string): string {
  return raw.replace(/\D/g, '');
}

/**
 * 过滤为非负小数输入草稿（仅保留数字与单个小数点）。
 * `maxFractionDigits`：可选，限制小数部分的最大位数（输入阶段即截断）。
 */
function filterNonNegativeDecimalInput(
  raw: string,
  maxFractionDigits?: number,
): string {
  const sanitized = raw.replace(/[^\d.]/g, '');
  const dotIndex = sanitized.indexOf('.');

  if (dotIndex === -1) {
    return sanitized;
  }

  const integerPart = sanitized.slice(0, dotIndex);
  const fractionalDigits = sanitized.slice(dotIndex + 1).replace(/\./g, '');
  const trimmedFractional =
    typeof maxFractionDigits === 'number'
      ? fractionalDigits.slice(0, maxFractionDigits)
      : fractionalDigits;

  return `${integerPart}.${trimmedFractional}`;
}

function DreamActorMaterialCard({
  actor,
  selected,
  onSelect,
}: {
  actor: AssetInfoDto;
  selected: boolean;
  onSelect: () => void;
}) {
  const name = getActorDisplayName(actor);
  const imageUrl = getActorAvatarUrl(actor);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        // Layout
        'flex w-full min-w-0 flex-col items-center justify-center text-center',
        // Spacing — Figma 7369:58259：px-24 py-32 gap-8 / 移动端收敛
        'gap-2 rounded-xl bg-muted p-4',
        'md:h-[200px] md:gap-2 md:rounded-2xl md:px-6 md:py-8',
        // State
        'transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'hover:bg-muted/90',
      )}
    >
      <div className="size-[72px] overflow-hidden rounded-full bg-background">
        {imageUrl ? (
          <img
            alt=""
            className="size-full object-cover"
            decoding="async"
            loading="lazy"
            src={imageUrl}
          />
        ) : (
          <img
            alt=""
            className="size-full object-cover"
            decoding="async"
            loading="lazy"
            src={roleFormAvatarPlaceholder}
          />
        )}
      </div>
      <strong className="w-full truncate text-base leading-6 font-bold text-foreground">
        {name}
      </strong>
      {/* Figma 7369:58259 打勾 — circle-check：选中填充+反色勾 / 未选空心描边 */}
      <IconCircleCheck selected={selected} className="size-6 shrink-0" />
    </button>
  );
}

type CreateActorFormProps = {
  actorId?: string;
};

export function CreateActorForm({ actorId }: CreateActorFormProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { chainlinks } = useConfigStore();
  const walletUsdcBalance = useGlobalStore((state) => state.walletUsdcBalance);
  const { isEmbeddedLogin, solanaAddress } = useAppPrivyAccount();
  const { notifyInsufficientUsdc } = useNotifyInsufficientUsdc();
  const {
    isReady: isCreateActorCollectionOnChainReady,
    executeCreateActorCollectionOnChain,
  } = useCreateActorCollectionOnChain();
  const {
    isReady: isSponsorCreateActorCollectionReady,
    executeSponsorCreateActorCollection,
  } = useSponsorCreateActorCollection();
  const isEditMode = actorId !== undefined;

  // 雪花 ID 必须保持字符串；generated API 当前类型为 number，调用边界只做类型适配。
  const actorIdForApi = actorId as unknown as number;
  const updateActorMutation = useMutation({
    mutationFn: updateActor,
  });
  const deleteActorMutation = useMutation({
    mutationFn: deleteActor,
  });
  const prepareActorCollectionMutation = usePrepareActorCollection();
  const mintActorCollectionMutation = useMintActorCollection();
  const actorForEditQuery = useQuery({
    queryKey: getGetActorForEditQueryKey(actorIdForApi),
    queryFn: ({ signal }) => getActorForEdit(actorIdForApi, { signal }),
    enabled: isEditMode,
    retry: false,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [avatarObjectKey, setAvatarObjectKey] = useState<string | null>(null);
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [dreamActorSearch, setDreamActorSearch] = useState('');
  const [selectedDreamActorId, setSelectedDreamActorId] = useState<
    string | null
  >(null);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [successActorName, setSuccessActorName] = useState('');
  const [successActorId, setSuccessActorId] = useState('');
  const [
    isCreateActorCollectionOnChainPending,
    setIsCreateActorCollectionOnChainPending,
  ] = useState(false);

  const dreamActorListQuery = useListAssets({
    query: {
      enabled: !isEditMode,
      retry: false,
    },
  });

  const validationSchema = useMemo(
    () => buildCreateActorSchema(t, isEditMode),
    [isEditMode, t],
  );

  const resolver = useMemo(
    () =>
      zodResolver(validationSchema) as Resolver<
        FormModel,
        unknown,
        CreateActorFormValues
      >,
    [validationSchema],
  );

  const form = useForm<FormModel, unknown, CreateActorFormValues>({
    resolver,
    defaultValues: DEFAULT_FORM_VALUES,
    mode: 'onSubmit',
  });

  const actorForEdit = useMemo(
    () => unwrapOrvalPayload<ActorEditResponse>(actorForEditQuery.data),
    [actorForEditQuery.data],
  );

  const dreamActorRows = useMemo(
    () => extractDreamActorRows(dreamActorListQuery.data),
    [dreamActorListQuery.data],
  );

  const filteredDreamActorRows = useMemo(
    () =>
      dreamActorRows.filter((actor) =>
        actorMatchesSearch(actor, dreamActorSearch),
      ),
    [dreamActorRows, dreamActorSearch],
  );

  useEffect(() => {
    if (!isEditMode || !actorForEdit) {
      return;
    }

    form.reset(buildActorEditFormValues(actorForEdit));
    setAvatarPreviewUrl(actorForEdit.avatarUrl?.trim() || null);
    setAvatarObjectKey(null);
  }, [actorForEdit, form, isEditMode]);

  const nftTotalSupply = useWatch({
    control: form.control,
    name: 'nftTotalSupply',
  });
  const creatorReserved = useWatch({
    control: form.control,
    name: 'creatorReserved',
  });
  const mintPriceUsdc = useWatch({
    control: form.control,
    name: 'mintPriceUsdc',
  });
  const actorNameValue = useWatch({
    control: form.control,
    name: 'actorName',
  });
  const bioValue = useWatch({
    control: form.control,
    name: 'bio',
  });
  const gender = useWatch({
    control: form.control,
    name: 'gender',
  });
  const pricingMode = useWatch({
    control: form.control,
    name: 'pricingMode',
  });

  const genderLabel =
    gender === CreateActorGender.Unspecified
      ? t('请选择')
      : t(GENDER_OPTIONS.find((o) => o.value === gender)?.labelKey ?? '请选择');

  const isSubmitting =
    updateActorMutation.isPending ||
    deleteActorMutation.isPending ||
    prepareActorCollectionMutation.isPending ||
    mintActorCollectionMutation.isPending ||
    isCreateActorCollectionOnChainPending ||
    isAvatarUploading;

  /** 开放 Mint = 发行总量 − 创作者保留，供只读展示与提交。 */
  const computedOpenMintAmount = useMemo(() => {
    const total = Number(nftTotalSupply);
    const reserved = Number(creatorReserved);

    if (
      !nftTotalSupply?.trim() ||
      !creatorReserved?.trim() ||
      !POSITIVE_INTEGER_RE.test(nftTotalSupply.trim()) ||
      !POSITIVE_INTEGER_RE.test(creatorReserved.trim())
    ) {
      return '';
    }

    const open = total - reserved;
    return open >= 0 ? String(open) : '';
  }, [nftTotalSupply, creatorReserved]);

  /** Mint 价格 × 创作者保留数量，供提示文案展示。 */
  const creatorReservePaymentUsdc = useMemo(() => {
    const price = mintPriceUsdc?.trim() ?? '';
    const qty = creatorReserved?.trim() ?? '';

    if (
      !price ||
      !qty ||
      !POSITIVE_INTEGER_RE.test(qty) ||
      Number.isNaN(Number(price)) ||
      Number(price) < 0
    ) {
      return null;
    }

    return formatNumber(toNumber(multipliedBy(price, qty)), 2);
  }, [mintPriceUsdc, creatorReserved]);

  const priceCoefficientLabel = useMemo(() => {
    const price = mintPriceUsdc?.trim() ?? '';
    if (!price || Number.isNaN(Number(price)) || Number(price) < 0) {
      return formatPowerFactor(0);
    }

    return formatPowerFactor(calculateActorPriceCoefficient(Number(price)));
  }, [mintPriceUsdc]);

  /** 打开文件选择器以选择形象照。 */
  function handleOpenAvatarPicker() {
    fileInputRef.current?.click();
  }

  /** 用户在下拉中选择性别项：写入表单并触发校验。 */
  function handleGenderSelect(next: CreateActorGender) {
    return () => {
      form.setValue('gender', next, { shouldValidate: true });
    };
  }

  function handlePricingModeSelect(
    next: PrepareActorCollectionRequestPricingMode,
  ) {
    return () => {
      form.setValue('pricingMode', next, { shouldValidate: true });
    };
  }

  /** 用户选择本地图片后：展示预览并预签上传到对象存储，写入 avatarObjectKey。 */
  async function handleAvatarFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    const nextUrl = URL.createObjectURL(file);
    setAvatarPreviewUrl((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev);
      }
      return nextUrl;
    });
    setAvatarObjectKey(null);
    setIsAvatarUploading(true);

    try {
      const key = await uploadCreatorActorAvatarObject(file);
      setAvatarObjectKey(key);
    } catch {
      setAvatarPreviewUrl((prev) => {
        if (prev) {
          URL.revokeObjectURL(prev);
        }
        return null;
      });
      setAvatarObjectKey(null);
      toast.error(t('形象照上传失败，请重试'));
    } finally {
      setIsAvatarUploading(false);
    }
  }

  /** 返回角色 IP 页面。 */
  function navigateToActorManagement() {
    void navigate({ to: '/actor' });
  }

  function handleCancel() {
    navigateToActorManagement();
  }

  function handleDreamActorSearchChange(event: ChangeEvent<HTMLInputElement>) {
    setDreamActorSearch(event.target.value);
  }

  function handleOpenDreamOs() {
    window.open(DREAM_OS_URL, '_blank', 'noopener,noreferrer');
  }

  function handleSelectDreamActor(actor: AssetInfoDto) {
    const actorIdText = actor.assetId?.trim() || getActorDisplayName(actor);
    setSelectedDreamActorId(actorIdText);
    form.setValue('actorName', getActorDisplayName(actor), {
      shouldValidate: true,
      shouldDirty: true,
    });
    form.setValue('bio', getActorBio(actor), {
      shouldValidate: true,
      shouldDirty: true,
    });
    setAvatarPreviewUrl(getActorAvatarUrl(actor) ?? null);
    setAvatarObjectKey(null);
  }

  function handleSuccessDialogOpenChange(open: boolean) {
    setSuccessDialogOpen(open);
  }

  // 去签约：关闭成功弹窗并进入该角色详情页
  function handleViewIssuedActor() {
    setSuccessDialogOpen(false);

    const actorId = successActorId.trim();
    if (actorId) {
      void navigate({ to: '/actor/$actorId', params: { actorId } });
      return;
    }

    navigateToActorManagement();
  }

  function handleOpenDeleteActorDialog() {
    setIsDeleteDialogOpen(true);
  }

  function handleDeleteDialogOpenChange(open: boolean) {
    if (!open && deleteActorMutation.isPending) {
      return;
    }

    setIsDeleteDialogOpen(open);
  }

  async function handleConfirmDeleteActor() {
    if (!actorId) {
      return;
    }

    try {
      const res = await deleteActorMutation.mutateAsync({
        actorId: actorIdForApi,
      });
      if (res.status !== 200) {
        return;
      }

      toast.success(t('删除成功'));
      setIsDeleteDialogOpen(false);

      await queryClient.invalidateQueries({
        queryKey: getCreatorActorListQueryKey(),
      });

      navigateToActorManagement();
    } catch {
      // 业务错误已由 appRequest 统一 toast
    }
  }

  /** 校验通过后按创建 / 编辑模式调用对应接口。 */
  async function handleSubmitValid(data: CreateActorFormValues) {
    if (!isEditMode) {
      const currentChain = getCurrentChain();
      const assetId = selectedDreamActorId?.trim();
      const trimmedActorName = data.actorName.trim();
      const trimmedBio = data.bio.trim();

      if (!solanaAddress) {
        return;
      }
      if (!assetId) {
        toast.error(t('请选择角色素材'));
        return;
      }
      if (!isEmbeddedLogin && !isCreateActorCollectionOnChainReady) {
        toast.error(t('请先连接 Solana 钱包'));
        return;
      }
      if (isEmbeddedLogin && !isSponsorCreateActorCollectionReady) {
        toast.error(t('网络不稳定，请稍后重试'));
        return;
      }

      if (
        walletUsdcBalance === undefined ||
        !isGreaterThanOrEqual(
          walletUsdcBalance,
          ACTOR_COLLECTION_ISSUE_FEE_USDC,
        )
      ) {
        notifyInsufficientUsdc(
          minus(ACTOR_COLLECTION_ISSUE_FEE_USDC, walletUsdcBalance ?? 0),
        );
        return;
      }

      const onChainContext =
        resolveCreateActorCollectionOnChainContext(chainlinks);
      if (!onChainContext) {
        toast.error(t('链上发行配置缺失，请稍后重试'));
        return;
      }

      const preparePayload = {
        assetId,
        name: trimmedActorName,
        bio: trimmedBio,
        totalSupply: Number(data.nftTotalSupply),
        pricingMode: data.pricingMode,
        initialPriceUsdc: Number(data.mintPriceUsdc),
      };
      const prepareCacheKey = buildActorCollectionPrepareCacheKey({
        assetId,
        name: trimmedActorName,
        bio: trimmedBio,
        pricingMode: data.pricingMode,
        totalSupply: Number(data.nftTotalSupply),
        initialPriceUsdc: Number(data.mintPriceUsdc),
      });

      let shouldToastSubmitError = false;

      try {
        let actorCollectionId = getCachedActorCollectionId(prepareCacheKey);
        if (!actorCollectionId) {
          const prepareRes = await prepareActorCollectionMutation.mutateAsync({
            data: preparePayload,
          });
          if (prepareRes.status !== 200) {
            return;
          }

          const preparedActorCollection =
            unwrapOrvalPayload<PrepareActorCollectionResponse>(prepareRes);
          actorCollectionId = readSnowflakeId(
            preparedActorCollection?.actorCollectionId,
          );
          if (actorCollectionId) {
            setCachedActorCollectionId(
              prepareCacheKey,
              actorCollectionId,
              preparedActorCollection?.expiresAt,
            );
          }
        }

        if (!actorCollectionId) {
          toast.error(t('角色 IP 订单编号无效，请刷新后重试'));
          return;
        }

        const nftContractAddress =
          await resolveCreateActorCollectionMintAddress({
            assetId: actorCollectionId,
            storyProgramId: onChainContext.storyProgramId,
          });

        const actorCollectionIdForApi = actorCollectionId as unknown as number;
        const mintPayload: MintActorCollectionRequest = {
          actorCollectionId: actorCollectionIdForApi,
          nftChain: currentChain,
          nftTokenStandard: 'NFT',
          nftContractAddress,
          payMethod: getConfiguredActorCollectionPayMethod(),
          // mint digest 按当前 Solana 钱包签发，与链上 creator 一致
          walletAddress: solanaAddress ?? '',
        };

        const res = await mintActorCollectionMutation.mutateAsync({
          actorCollectionId: actorCollectionIdForApi,
          data: mintPayload,
        });
        if (res.status !== 200) {
          return;
        }

        const mintDigest =
          unwrapOrvalPayload<ActorCollectionMintDigestResponse>(res);
        if (!mintDigest) {
          toast.error(t('发行签名数据为空，请稍后重试'));
          return;
        }

        setIsCreateActorCollectionOnChainPending(true);
        shouldToastSubmitError = true;
        try {
          const onChainParams = {
            digest: mintDigest,
            canonicalPayload: mintDigest.canonicalPayload?.trim() || undefined,
            ...onChainContext,
          };
          if (isEmbeddedLogin) {
            await executeSponsorCreateActorCollection(onChainParams);
          } else {
            await executeCreateActorCollectionOnChain(onChainParams);
          }
        } finally {
          setIsCreateActorCollectionOnChainPending(false);
        }

        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: getListActorCollectionsQueryKey(),
          }),
          queryClient.invalidateQueries({
            queryKey: getListAssetsQueryKey(),
          }),
        ]);

        removeCachedActorCollectionId(prepareCacheKey);
        setSuccessActorName(trimmedActorName);
        setSuccessActorId(actorCollectionId);
        setSuccessDialogOpen(true);
      } catch (error) {
        if (shouldToastSubmitError) {
          if (
            notifyDirectWalletSimulationError(error, {
              t,
              logPrefix: '[CreateActorForm] issue',
              enabled: !isEmbeddedLogin,
              fallbackToastKey: '发行失败，请稍后重试',
            })
          ) {
            return;
          }

          toast.error(
            getSponsorSubmitErrorMessage(error, t, '发行失败，请稍后重试'),
          );
        }
      }
      return;
    }

    const totalSupply = Number(data.nftTotalSupply);
    const reserved = Number(data.creatorReserved);
    const mintQty = totalSupply - reserved;

    if (!actorId) {
      return;
    }

    const updatePayload: UpdateActorRequest = {
      name: data.actorName.trim(),
      gender: data.gender,
      bio: data.bio.trim(),
      creatorReservedQuantity: reserved,
      mintQuantity: mintQty,
      nftUnitPrice: Number(data.mintPriceUsdc),
      nftMinHoldThreshold: Number(data.minHoldThreshold),
    };

    if (avatarObjectKey?.trim()) {
      updatePayload.avatarObjectKey = avatarObjectKey.trim();
    }

    try {
      await updateActorMutation.mutateAsync({
        actorId: actorIdForApi,
        data: updatePayload,
      });
      toast.success(t('保存成功'));

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: getCreatorActorListQueryKey(),
        }),
        queryClient.invalidateQueries({
          queryKey: getGetActorForEditQueryKey(actorIdForApi),
        }),
      ]);

      navigateToActorManagement();
    } catch {
      // 业务错误已由 appRequest 统一 toast
    }
  }

  if (isEditMode && actorForEditQuery.isLoading) {
    return (
      <AppLoadingContainer
        data={[]}
        isLoading
        minHeight={420}
        scrollable={false}
      >
        <div />
      </AppLoadingContainer>
    );
  }

  if (isEditMode && (actorForEditQuery.isError || !actorForEdit)) {
    return (
      <AppLoadingContainer
        data={[]}
        isError={actorForEditQuery.isError}
        minHeight={420}
        emptyDescription={t('暂无角色编辑数据')}
        scrollable={false}
      >
        <div />
      </AppLoadingContainer>
    );
  }
  if (!isEditMode) {
    const isDreamActorListLoading = dreamActorListQuery.isLoading;
    const showDreamActorEmpty =
      !isDreamActorListLoading &&
      (dreamActorRows.length === 0 || filteredDreamActorRows.length === 0);

    return (
      <Form {...form}>
        <form
          className="flex w-full flex-col gap-4"
          onSubmit={form.handleSubmit(handleSubmitValid)}
          noValidate
        >
          <section className="flex w-full flex-col gap-8 rounded-xl bg-card p-4 md:rounded-3xl md:p-8">
            <section className="flex w-full flex-col gap-6 rounded-lg md:gap-8">
              <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex min-w-0 flex-1 flex-col gap-4">
                  <p className="text-sm leading-5 text-foreground">
                    {t(
                      '发行一个演员 IP 之后可在该 IP 下签约演员，演员可派遣产生收益。',
                    )}
                  </p>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2
                        className={cn(
                          'text-lg leading-[26px] font-bold tracking-[-0.04px] text-foreground',
                        )}
                      >
                        {t('选择角色素材')}
                      </h2>
                      <Button
                        type="button"
                        onClick={handleOpenDreamOs}
                        className={cn(
                          'h-8 shrink-0 gap-1 rounded-xl px-3',
                          'bg-foreground text-[13px] leading-[18px] font-bold text-background',
                          'hover:bg-foreground/90',
                        )}
                      >
                        {t('前往 DreamOS')}
                        <IconArrowRight className="size-4" />
                      </Button>
                    </div>
                    <p className="text-sm leading-5 text-wallet-text-tertiary">
                      {t('进入DreamOS项目 → 创建角色 → 进入StoryFun发行 IP')}
                    </p>
                  </div>
                </div>

                <label
                  className={cn(
                    // Layout
                    'flex w-full items-center gap-2',
                    // Spacing — Figma 7369:58252：py-11 px-13 / 移动端收敛
                    'h-10 rounded-lg bg-muted p-3',
                    'md:h-12 md:w-[617px] md:gap-1.5 md:rounded-[71px] md:border md:border-border md:bg-transparent md:px-[13px] md:py-[11px]',
                  )}
                >
                  <IconSearch className="size-5 shrink-0 text-muted-foreground md:size-6" />
                  <input
                    type="search"
                    value={dreamActorSearch}
                    onChange={handleDreamActorSearchChange}
                    placeholder={t('搜索角色姓名')}
                    className="min-w-0 flex-1 bg-transparent text-sm leading-5 text-foreground outline-none placeholder:text-muted-foreground"
                  />
                </label>
              </header>

              {isDreamActorListLoading ? (
                <div className="flex h-[412px] w-full items-center justify-center">
                  <Spinner className="size-6 text-muted-foreground" />
                </div>
              ) : showDreamActorEmpty ? (
                <div className="flex h-[412px] w-full flex-col items-center justify-center gap-4 text-center">
                  <IconNoData className="size-[88px] shrink-0" />
                  <p className="max-w-[520px] text-sm leading-5 text-muted-foreground">
                    {dreamActorRows.length === 0
                      ? t(
                          '您还没有在 DreamOS 中创建角色素材。请先前往 DreamOS 创建角色，再回来进行 NFT 发行。',
                        )
                      : t('没有找到匹配的角色素材')}
                  </p>
                  {dreamActorRows.length === 0 ? (
                    <Button
                      type="button"
                      onClick={handleOpenDreamOs}
                      className="h-11 rounded-[64px] bg-foreground px-8 text-sm leading-5 font-bold text-background hover:bg-foreground/90 hover:text-background"
                    >
                      {t('前往 DreamOS 创建')}
                    </Button>
                  ) : null}
                </div>
              ) : (
                <div
                  className={cn(
                    'max-md:-mx-4 max-md:overflow-x-auto',
                    'max-md:[-webkit-overflow-scrolling:touch]',
                  )}
                >
                  <ul
                    className={cn(
                      'list-none p-0',
                      'max-md:grid max-md:w-max max-md:grid-flow-col max-md:grid-rows-2',
                      'max-md:auto-cols-[calc((100vw-32px-12px)/2)] max-md:gap-3 max-md:px-4',
                      'md:grid md:w-full md:grid-cols-5 md:gap-3',
                    )}
                  >
                    {filteredDreamActorRows.map((actor) => {
                      const actorIdText =
                        actor.assetId?.trim() || getActorDisplayName(actor);
                      return (
                        <li key={actorIdText} className="min-w-0">
                          <DreamActorMaterialCard
                            actor={actor}
                            selected={selectedDreamActorId === actorIdText}
                            onSelect={() => handleSelectDreamActor(actor)}
                          />
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </section>

            <div className="flex w-full min-w-0 flex-col gap-4">
              <FormField
                control={form.control}
                name="actorName"
                render={({ field }) => (
                  <FormItem className="gap-3">
                    <FormLabel className="text-base leading-6 font-bold text-foreground">
                      {t('角色姓名')}
                    </FormLabel>
                    <FormControl>
                      <div className="relative min-w-0">
                        <Input
                          id="create-actor-name"
                          placeholder={t('输入角色姓名')}
                          maxLength={20}
                          className={cn(
                            inputSurfaceClass,
                            'h-auto min-h-[52px] pr-12',
                          )}
                          autoComplete="off"
                          {...field}
                        />
                        <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-xs leading-4 tracking-[0.04px] text-muted-foreground">
                          {actorNameValue?.length ?? 0}/20
                        </span>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem className="min-w-0 gap-3">
                    <FormLabel className="text-base leading-6 font-bold text-foreground">
                      {t('简介')}
                    </FormLabel>
                    <FormControl>
                      <div className="relative min-w-0">
                        <Textarea
                          id="create-actor-bio"
                          maxLength={500}
                          placeholder={t('请输入角色 IP 介绍')}
                          rows={4}
                          className={cn(
                            inputSurfaceClass,
                            'min-h-[120px] min-w-0 resize-none break-words py-4 pr-14',
                            // 覆盖 Textarea 基类 dark:bg-input/30，与 inputSurfaceClass 表面色一致
                            'field-sizing-fixed dark:bg-create-flow-input-surface',
                          )}
                          {...field}
                        />
                        <span className="pointer-events-none absolute right-4 bottom-4 text-xs leading-4 tracking-[0.04px] text-muted-foreground">
                          {bioValue?.length ?? 0}/500
                        </span>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <section className="flex w-full flex-col gap-4">
              <div className="flex flex-col gap-1">
                <h2 className="text-lg leading-[26px] font-bold tracking-[-0.04px] text-foreground">
                  {t('角色 IP 发行参数')}
                </h2>
                <p className="text-sm leading-5 text-muted-foreground">
                  {t('设定角色 IP 的发行参数，发行后不可修改。')}
                </p>
              </div>

              <FormField
                control={form.control}
                name="nftTotalSupply"
                render={({ field }) => (
                  <FormItem className="flex min-w-0 flex-col gap-3">
                    <FormLabel className="text-base leading-6 font-bold text-foreground">
                      {t('角色发行总量')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        id="create-actor-nft-total"
                        placeholder="100 - 5,000"
                        inputMode="numeric"
                        className={cn(inputSurfaceClass, 'h-auto min-h-[52px]')}
                        {...field}
                        onChange={(event) => {
                          field.onChange(
                            filterPositiveIntegerInput(event.target.value),
                          );
                        }}
                      />
                    </FormControl>
                    <p className="text-xs leading-4 text-muted-foreground">
                      {t('发行总量范围 100 - 5,000。')}
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pricingMode"
                render={() => (
                  <FormItem className="flex min-w-0 flex-col gap-3">
                    <FormControl>
                      {/* Figma 6223:53777 SegmentedPicker：h-44 / track secondary / selected primary */}
                      <div className="flex h-11 overflow-hidden rounded-lg bg-muted p-0.5 md:w-[343px]">
                        {ACTOR_PRICING_MODE_OPTIONS.map((option) => {
                          const selected = pricingMode === option.value;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={handlePricingModeSelect(option.value)}
                              className={cn(
                                'flex flex-1 items-center justify-center rounded-md px-2 text-[13px] leading-5 tracking-[-0.08px] transition-colors',
                                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                selected
                                  ? 'bg-background font-semibold text-foreground shadow-[0_0_0_0.5px_rgba(0,0,0,0.04)]'
                                  : 'font-medium text-foreground hover:bg-background/60',
                              )}
                            >
                              {t(option.labelKey)}
                            </button>
                          );
                        })}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mintPriceUsdc"
                render={({ field }) => (
                  <FormItem className="flex min-w-0 flex-col gap-3">
                    <FormLabel className="text-base leading-6 font-bold text-foreground">
                      {t(
                        pricingMode ===
                          PrepareActorCollectionRequestPricingMode.FIXED
                          ? '固定价格（USDC）'
                          : '初始价格（USDC）',
                      )}
                    </FormLabel>
                    <FormControl>
                      <Input
                        id="create-actor-mint-price"
                        placeholder="10 - 1,000"
                        inputMode="decimal"
                        className={cn(inputSurfaceClass, 'h-auto min-h-[52px]')}
                        {...field}
                        onChange={(event) => {
                          field.onChange(
                            filterNonNegativeDecimalInput(
                              event.target.value,
                              MINT_PRICE_MAX_FRACTION_DIGITS,
                            ),
                          );
                        }}
                      />
                    </FormControl>
                    {pricingMode ===
                    PrepareActorCollectionRequestPricingMode.FIXED ? (
                      <div className="flex flex-col gap-1">
                        <p className="text-xs leading-4 tracking-[0.04px] text-muted-foreground">
                          {`· ${t('每个角色都以固定不变的价格购买，不会随销量变化。')}`}
                        </p>
                        <div className="flex items-center gap-1 text-xs leading-4 tracking-[0.04px] text-muted-foreground">
                          <span>
                            {`· ${t('价格系数 {{value}}', {
                              value: priceCoefficientLabel,
                            })}`}
                          </span>
                          <ActorPriceCoefficientTooltip />
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-xs leading-4 tracking-[0.04px] text-muted-foreground">
                          {t(
                            '初始价格为联合曲线起始价，每签约一个角色，价格按公式 P = P₀ × 5^(已签约数/发行总量) 自动上涨，早期签约更优惠。',
                          )}
                        </p>
                        <div className="flex items-center gap-1 text-xs leading-4 tracking-[0.04px] text-muted-foreground">
                          <span>
                            {t('价格系数 {{value}}', {
                              value: priceCoefficientLabel,
                            })}
                          </span>
                          <ActorPriceCoefficientTooltip />
                        </div>
                      </>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </section>

            {/* Figma 7369:77151 — 品牌红 5% 底 + 深红文案 */}
            <div className="flex w-full items-center gap-1.5 rounded-xl bg-onestory-brand-red/5 p-4 text-sm leading-5 text-play-drama-stat-foreground">
              <span className="font-medium">{t('手续费')}</span>
              <strong className="font-bold">{'1 USDC'}</strong>
            </div>

            <footer
              className={cn(
                'flex w-full flex-row items-stretch gap-3',
                'md:items-center md:justify-end',
              )}
            >
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={handleCancel}
                className={cn(
                  FOOTER_BUTTON_BASE_CLASS_NAME,
                  'border-[1.5px] border-border text-foreground',
                )}
              >
                <span className="min-w-0 truncate">{t('取消')}</span>
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className={cn(
                  FOOTER_BUTTON_BASE_CLASS_NAME,
                  'border-foreground bg-foreground text-background',
                  'hover:bg-foreground/90 hover:text-background',
                )}
              >
                {isSubmitting ? (
                  <span
                    className={cn(
                      'inline-flex min-w-0 items-center justify-center',
                      'gap-2',
                    )}
                  >
                    <Spinner className="size-4 text-background" />
                    <span className="min-w-0 truncate">{t('确定发行')}</span>
                  </span>
                ) : (
                  <span className="min-w-0 truncate">{t('确定发行')}</span>
                )}
              </Button>
            </footer>
          </section>
        </form>

        <CreateActorSuccessDialog
          open={successDialogOpen}
          actorName={successActorName}
          actorId={successActorId}
          onOpenChange={handleSuccessDialogOpenChange}
          onSign={handleViewIssuedActor}
        />
      </Form>
    );
  }

  return (
    <Form {...form}>
      <form
        className="flex w-full flex-col gap-2"
        onSubmit={form.handleSubmit(handleSubmitValid)}
        noValidate
      >
        <section
          className={cn(
            'flex w-full flex-col gap-10 rounded-3xl bg-card p-6',
            'md:gap-14 md:p-8',
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={handleAvatarFileChange}
          />

          <div className="flex w-full items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <Button
                type="button"
                variant="ghost"
                disabled={isAvatarUploading}
                onClick={handleOpenAvatarPicker}
                aria-label={t(isEditMode ? '更换形象照' : '上传形象照')}
                className={cn(
                  'relative flex h-auto min-h-0 w-48 shrink-0 items-center justify-center overflow-hidden rounded-2xl p-0',
                  PLAY_CARD_COVER_ASPECT_CLASS,
                  'border border-create-flow-input-border bg-create-flow-input-surface',
                  'shadow-none',
                  'transition-opacity hover:bg-create-flow-input-surface hover:text-foreground hover:opacity-95',
                  'disabled:pointer-events-none disabled:opacity-70',
                )}
              >
                {isAvatarUploading ? (
                  <div
                    className={cn(
                      'absolute inset-0 z-10 flex items-center justify-center bg-background/40',
                    )}
                  >
                    <Spinner className="size-6 text-create-flow-accent" />
                  </div>
                ) : null}
                {avatarPreviewUrl ? (
                  <img
                    src={avatarPreviewUrl}
                    alt=""
                    className={cn(
                      'absolute inset-0 size-full rounded-2xl object-cover',
                    )}
                  />
                ) : (
                  <img
                    src={roleFormAvatarPlaceholder}
                    alt=""
                    className={cn('relative size-20 object-contain')}
                  />
                )}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={isAvatarUploading}
                className={cn(
                  'h-auto rounded-full px-6 py-2',
                  'text-sm leading-5 font-bold text-foreground',
                )}
                onClick={handleOpenAvatarPicker}
              >
                {t(isEditMode ? '更换形象照' : '上传形象照')}
              </Button>
            </div>
          </div>

          <div className="flex w-full flex-col gap-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-4">
              <FormField
                control={form.control}
                name="actorName"
                render={({ field }) => (
                  <FormItem className="gap-3">
                    <FormLabel className="flex items-center gap-2 text-base leading-6 font-bold text-foreground">
                      {t('角色姓名')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        id="create-actor-name"
                        placeholder={t('请输入角色姓名')}
                        maxLength={30}
                        className={cn(inputSurfaceClass, 'h-auto min-h-[52px]')}
                        autoComplete="off"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gender"
                render={() => (
                  <FormItem className="flex min-w-0 flex-col gap-3">
                    <FormLabel className="text-base leading-6 font-bold text-foreground">
                      {t('性别')}
                    </FormLabel>
                    <FormControl>
                      <DropdownMenu modal={false}>
                        <DropdownMenuTrigger
                          render={
                            <button
                              type="button"
                              className={cn(
                                'flex w-full items-center justify-between gap-2.5',
                                'min-h-[52px] rounded-2xl border border-create-flow-input-border bg-create-flow-input-surface px-4 py-3.5',
                                'text-left text-sm leading-5 transition-colors',
                                'hover:bg-create-flow-input-surface/90',
                                gender === CreateActorGender.Unspecified
                                  ? 'text-muted-foreground'
                                  : 'text-foreground',
                              )}
                            >
                              <span className="min-w-0 flex-1 truncate">
                                {genderLabel}
                              </span>
                              <span
                                className="flex shrink-0 flex-col items-center justify-center text-foreground"
                                aria-hidden
                              >
                                <IconChevronDown className="size-3 -mb-0.5 rotate-180" />
                                <IconChevronDown className="size-3" />
                              </span>
                            </button>
                          }
                        />
                        <DropdownMenuContent
                          align="start"
                          sideOffset={8}
                          className={cn(
                            'rounded-2xl border border-border bg-card p-4',
                            'shadow-[3px_4px_12px_rgba(0,0,0,0.08)]',
                            'ring-0',
                          )}
                        >
                          <div className="flex flex-col gap-4">
                            {GENDER_OPTIONS.map((opt) => (
                              <DropdownMenuItem
                                key={opt.value}
                                className={cn(
                                  'cursor-pointer rounded-none bg-transparent px-0 py-0',
                                  'text-sm leading-5 font-medium text-foreground',
                                  'focus:bg-transparent focus:text-foreground',
                                  'data-highlighted:bg-muted',
                                )}
                                onClick={handleGenderSelect(opt.value)}
                              >
                                {t(opt.labelKey)}
                              </DropdownMenuItem>
                            ))}
                          </div>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem className="min-w-0 gap-3">
                  <FormLabel className="text-base leading-6 font-bold text-foreground">
                    {t('简介')}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      id="create-actor-bio"
                      maxLength={200}
                      placeholder={t('角色背景、性格特点、代表作...')}
                      rows={4}
                      className={cn(
                        inputSurfaceClass,
                        'min-h-[120px] min-w-0 resize-y break-words py-4',
                        'field-sizing-fixed',
                      )}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-4">
              <FormField
                control={form.control}
                name="nftTotalSupply"
                render={({ field }) => (
                  <FormItem className="flex min-w-0 flex-col gap-3">
                    <FormLabel className="text-base leading-6 font-bold text-foreground">
                      {t('NFT发行总量')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        id="create-actor-nft-total"
                        placeholder="100 - 5,000"
                        inputMode="numeric"
                        className={cn(inputSurfaceClass, 'h-auto min-h-[52px]')}
                        {...field}
                        onChange={(event) => {
                          field.onChange(
                            filterPositiveIntegerInput(event.target.value),
                          );
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="creatorReserved"
                render={({ field }) => (
                  <FormItem className="flex min-w-0 flex-col gap-3">
                    <FormLabel className="text-base leading-6 font-bold text-foreground">
                      {t('创作者保留 (数量)')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        id="create-actor-creator-reserved"
                        placeholder={t('请输入')}
                        inputMode="numeric"
                        className={cn(inputSurfaceClass, 'h-auto min-h-[52px]')}
                        {...field}
                        onChange={(event) => {
                          field.onChange(
                            filterPositiveIntegerInput(event.target.value),
                          );
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-4">
              <FormField
                control={form.control}
                name="mintPriceUsdc"
                render={({ field }) => (
                  <FormItem className="flex min-w-0 flex-col gap-3">
                    <FormLabel className="text-base leading-6 font-bold text-foreground">
                      {t('Mint价格 (USDC)')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        id="create-actor-mint-price"
                        placeholder="10 - 1,000"
                        inputMode="decimal"
                        className={cn(inputSurfaceClass, 'h-auto min-h-[52px]')}
                        {...field}
                        onChange={(event) => {
                          field.onChange(
                            filterNonNegativeDecimalInput(
                              event.target.value,
                              MINT_PRICE_MAX_FRACTION_DIGITS,
                            ),
                          );
                        }}
                      />
                    </FormControl>
                    <p className="text-xs leading-4 text-muted-foreground">
                      {t('你需要支付{{amount}} USDC用于创作者保留', {
                        amount: creatorReservePaymentUsdc ?? '—',
                      })}
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="minHoldThreshold"
                render={({ field }) => (
                  <FormItem className="flex min-w-0 flex-col gap-3">
                    <FormLabel className="text-base leading-6 font-bold text-foreground">
                      {t('最低持有门槛 (数量)')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        id="create-actor-min-hold"
                        placeholder={t('请输入')}
                        inputMode="numeric"
                        className={cn(inputSurfaceClass, 'h-auto min-h-[52px]')}
                        {...field}
                        onChange={(event) => {
                          field.onChange(
                            filterNonNegativeIntegerInput(event.target.value),
                          );
                        }}
                      />
                    </FormControl>
                    <p className="text-xs leading-4 text-muted-foreground">
                      {t('持有≥该数量才能参与AI角色对话')}
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div
              className={cn(
                'flex flex-col gap-2 rounded-2xl bg-create-flow-accent/6 px-4 py-4',
                'text-sm leading-5',
              )}
            >
              <p className="flex items-center gap-1.5 font-medium text-create-flow-accent">
                <span>{t('开放Mint数量')}</span>
                <strong className="text-base leading-6 font-bold">
                  {computedOpenMintAmount || '0'}
                </strong>
              </p>
              <p className="text-muted-foreground">
                {t('审核通过之后可铸造角色NFT')}
              </p>
            </div>

            <div className="flex w-full items-center gap-1.5 rounded-xl bg-onestory-brand-red/5 p-4 text-sm leading-5 text-play-drama-stat-foreground">
              <span className="font-medium">{t('手续费')}</span>
              <strong className="font-bold">{'1 USDC'}</strong>
            </div>

            <footer
              className={cn(
                'flex w-full flex-row items-stretch gap-3',
                'md:items-center md:justify-end',
              )}
            >
              {isEditMode ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={handleOpenDeleteActorDialog}
                  className={cn(
                    FOOTER_BUTTON_BASE_CLASS_NAME,
                    'border-[1.5px] border-border text-foreground',
                  )}
                >
                  <span className="min-w-0 truncate">{t('删除角色')}</span>
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={handleCancel}
                className={cn(
                  FOOTER_BUTTON_BASE_CLASS_NAME,
                  'border-[1.5px] border-border text-foreground',
                )}
              >
                <span className="min-w-0 truncate">{t('取消')}</span>
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className={cn(
                  FOOTER_BUTTON_BASE_CLASS_NAME,
                  'border-foreground bg-foreground text-background',
                  'hover:bg-foreground/90 hover:text-background',
                )}
              >
                {updateActorMutation.isPending ? (
                  <span
                    className={cn(
                      'inline-flex min-w-0 items-center justify-center',
                      'gap-2',
                    )}
                  >
                    <Spinner className="size-4 text-background" />
                    <span className="min-w-0 truncate">{t('保存中')}</span>
                  </span>
                ) : (
                  <span className="min-w-0 truncate">
                    {t(isEditMode ? '保存修改' : '提交审核')}
                  </span>
                )}
              </Button>
            </footer>
          </div>
        </section>
      </form>

      <DeleteActorConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={handleDeleteDialogOpenChange}
        onConfirmDelete={handleConfirmDeleteActor}
        isDeleting={deleteActorMutation.isPending}
      />
    </Form>
  );
}
