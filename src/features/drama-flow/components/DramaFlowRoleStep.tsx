import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  getOwnedActorCollectionsQueryKey,
  ownedActorCollections,
} from '@/api/__generated__/story/actor-i-p/actor-i-p';
import type { ActorCollectionResponse } from '@/api/__generated__/story/model/actorCollectionResponse';
import { DramaFlowRoleActorSelectionDialog } from '@/features/drama-flow/components/DramaFlowRoleActorSelectionDialog';
import { DramaFlowSecondFooter } from '@/features/drama-flow/components/DramaFlowSecondFooter';
import { DramaFlowStepCard } from '@/features/drama-flow/components/DramaFlowStepCard';
import { DramaFlowSubmitReviewSuccessDialog } from '@/features/drama-flow/components/DramaFlowSubmitReviewSuccessDialog';
import { DramaFlowThirdRoleCard } from '@/features/drama-flow/components/DramaFlowThirdRoleCard';
import { DramaFlowThirdRolePanel } from '@/features/drama-flow/components/DramaFlowThirdRolePanel';
import { DRAMA_FLOW_MAX_ROLES } from '@/features/drama-flow/constants/dramaFlowRoleGrid';
import { useDramaFlowConfig } from '@/features/drama-flow/contexts/DramaFlowConfigContext';
import { useDramaFlowStore } from '@/features/drama-flow/hooks/useDramaFlowStore';
import { useDramaFlowSubmitReview } from '@/features/drama-flow/hooks/useDramaFlowSubmitReview';
import type { DramaFlowRole } from '@/features/drama-flow/types/dramaFlowDocument';
import { isActorBindWindowExpired } from '@/features/drama-flow/utils/dramaActorBindWindow';
import { unwrapOrvalPayload } from '@/features/mining/miningFormat';
import { readSnowflakeId } from '@/utils/snowflakeId';

type CreateThirdIndexProps = {
  onGoToStep: (step: 1 | 2 | 3) => void;
};

function resolveBoundRoleDisplay(
  role: DramaFlowRole,
  ownedCollections: ActorCollectionResponse[],
) {
  const collection = role.actorCollectionId
    ? ownedCollections.find(
        (item) => readSnowflakeId(item.id) === role.actorCollectionId,
      )
    : undefined;

  return {
    name: collection?.name ?? role.name ?? '',
    actorId: role.actorCollectionId,
    coverUrl: collection?.avatarUrl ?? role.originalAvatarUrl,
  };
}

export function DramaFlowRoleStep({ onGoToStep }: CreateThirdIndexProps) {
  const { t } = useTranslation();
  const { mode, baselineDocument } = useDramaFlowConfig();
  const isEditMode = mode === 'edit';
  const document = useDramaFlowStore((s) => s.document);
  const hasHydrated = useDramaFlowStore((s) => s.hasHydrated);
  const replaceRoles = useDramaFlowStore((s) => s.replaceRoles);
  const {
    handleSubmitReview,
    submitSuccessOpen,
    setSubmitSuccessOpen,
    handleSubmitSuccessConfirm,
    submitPending,
  } = useDramaFlowSubmitReview();
  const [selectDialogOpen, setSelectDialogOpen] = useState(false);

  const { data: collectionsResponse } = useQuery({
    queryKey: getOwnedActorCollectionsQueryKey(),
    queryFn: ({ signal }) => ownedActorCollections({ signal }),
    staleTime: 60 * 1000 * 5,
  });
  const ownedCollections =
    unwrapOrvalPayload<ActorCollectionResponse[]>(collectionsResponse) ?? [];

  const roles = useMemo(
    () =>
      (document.roles ?? []).filter((role) => role.actorCollectionId != null),
    [document.roles],
  );

  const boundActorCollectionIds = useMemo(
    () =>
      roles
        .map((role) => role.actorCollectionId)
        .filter((id): id is string => id !== undefined && id.length > 0),
    [roles],
  );

  // 编辑态 baseline 已绑定：卡片与弹窗均不可移除；创建态为空。
  const lockedActorCollectionIds = useMemo(() => {
    if (!isEditMode || !baselineDocument) {
      return [];
    }

    return (baselineDocument.roles ?? [])
      .map((role) => readSnowflakeId(role.actorCollectionId))
      .filter((id): id is string => id !== undefined && id.length > 0);
  }, [baselineDocument, isEditMode]);

  const lockedActorCollectionIdSet = useMemo(
    () => new Set(lockedActorCollectionIds),
    [lockedActorCollectionIds],
  );

  // 选择弹窗按总数上限校验；锁定 ID 计入已选且不可取消。
  const maxSelectable = DRAMA_FLOW_MAX_ROLES;

  // 水合后过滤无 IP 的旧人物草稿，并重写 sortNo。
  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    const allRoles = document.roles ?? [];
    const boundRoles = allRoles.filter(
      (role) => role.actorCollectionId != null,
    );
    const needsFilter = boundRoles.length !== allRoles.length;
    const needsSort = boundRoles.some(
      (role, index) => role.sortNo !== index + 1,
    );

    if (!needsFilter && !needsSort) {
      return;
    }

    replaceRoles(
      boundRoles.map((role, index) => ({
        ...role,
        sortNo: index + 1,
      })),
    );
  }, [document.roles, hasHydrated, replaceRoles]);

  const handleSaveDraft = () => {
    replaceRoles(roles);
    toast.success(t('草稿已保存'));
  };

  const handlePrevStep = () => {
    onGoToStep(2);
  };

  const handleOpenSelectDialog = () => {
    if (isActorBindWindowExpired(document.onlineAt)) {
      toast.error(t('已超过7天窗口期，不可新增绑定角色IP'));
      return;
    }

    setSelectDialogOpen(true);
  };

  const handleSelectDialogOpenChange = (open: boolean) => {
    setSelectDialogOpen(open);
  };

  // 按弹窗完整勾选集同步角色：保留锁定与仍勾选的绑定，新增勾选，移除可删项的取消勾选。
  const handleConfirmBind = (actorCollectionIds: string[]) => {
    const confirmedIds = Array.from(
      new Set([...actorCollectionIds, ...lockedActorCollectionIds]),
    );
    const roleByCollectionId = new Map(
      roles
        .filter((role) => role.actorCollectionId)
        .map((role) => [role.actorCollectionId as string, role]),
    );

    const nextRoles: DramaFlowRole[] = confirmedIds.map(
      (actorCollectionId, index) => {
        const existing = roleByCollectionId.get(actorCollectionId);
        if (existing) {
          return {
            ...existing,
            sortNo: index + 1,
          };
        }

        const collection = ownedCollections.find(
          (item) => readSnowflakeId(item.id) === actorCollectionId,
        );

        return {
          clientId: crypto.randomUUID(),
          actorCollectionId,
          sortNo: index + 1,
          name: collection?.name,
          originalAvatarUrl: collection?.avatarUrl,
        };
      },
    );

    replaceRoles(nextRoles);
  };

  // 移除本次新追加绑定；baseline 锁定 ID 不允许移除。
  const handleRemoveBinding = (clientId: string) => {
    const target = roles.find((item) => item.clientId === clientId);
    const targetCollectionId = readSnowflakeId(target?.actorCollectionId);

    if (
      targetCollectionId &&
      lockedActorCollectionIdSet.has(targetCollectionId)
    ) {
      return;
    }

    const filtered = roles.filter((item) => item.clientId !== clientId);
    replaceRoles(
      filtered.map((item, index) => ({
        ...item,
        sortNo: index + 1,
      })),
    );
  };

  return (
    <>
      <DramaFlowStepCard currentStep={3}>
        <DramaFlowThirdRolePanel
          boundCount={roles.length}
          onlineAt={document.onlineAt}
          onOpenSelectDialog={handleOpenSelectDialog}
        >
          {roles.map((role) => {
            const display = resolveBoundRoleDisplay(role, ownedCollections);
            const collectionId = readSnowflakeId(role.actorCollectionId);
            const removeDisabled = Boolean(
              collectionId && lockedActorCollectionIdSet.has(collectionId),
            );

            return (
              <DramaFlowThirdRoleCard
                key={role.clientId}
                name={display.name}
                actorId={display.actorId}
                coverUrl={display.coverUrl}
                removeDisabled={removeDisabled}
                onRemove={() => handleRemoveBinding(role.clientId)}
              />
            );
          })}
        </DramaFlowThirdRolePanel>
        <DramaFlowSecondFooter
          onSaveDraft={handleSaveDraft}
          onPrev={handlePrevStep}
          onNext={handleSubmitReview}
          nextDisabled={false}
          nextLabelKey="发布"
          nextPending={submitPending}
        />
      </DramaFlowStepCard>
      <DramaFlowSubmitReviewSuccessDialog
        open={submitSuccessOpen}
        onOpenChange={setSubmitSuccessOpen}
        onConfirm={handleSubmitSuccessConfirm}
      />
      <DramaFlowRoleActorSelectionDialog
        open={selectDialogOpen}
        onOpenChange={handleSelectDialogOpenChange}
        boundActorCollectionIds={boundActorCollectionIds}
        lockedActorCollectionIds={lockedActorCollectionIds}
        maxSelectable={maxSelectable}
        onConfirm={handleConfirmBind}
      />
    </>
  );
}
