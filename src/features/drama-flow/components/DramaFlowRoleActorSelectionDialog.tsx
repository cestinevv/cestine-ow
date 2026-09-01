import { useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { useOwnedActorCollections } from '@/api/__generated__/story/actor-i-p/actor-i-p';
import type { ActorCollectionResponse } from '@/api/__generated__/story/model/actorCollectionResponse';
import IconArrowRight from '@/assets/svg/IconArrowRight';
import IconCheck from '@/assets/svg/IconCheck';
import IconNoData from '@/assets/svg/IconNoData';
import { AppDialog } from '@/components/common/AppDialog';
import AppLoadingContainer from '@/components/common/AppLoadingContainer';
import { Button } from '@/components/ui/button';
import { formatActorIpDisplay } from '@/features/actor/actorFormat';
import { unwrapOrvalPayload } from '@/features/mining/miningFormat';
import { cn } from '@/utils';
import { readSnowflakeId } from '@/utils/snowflakeId';

type IpSelectCheckboxProps = {
  state: 'unchecked' | 'selected' | 'bound';
};

function IpSelectCheckbox({ state }: IpSelectCheckboxProps) {
  return (
    <span
      className={cn(
        'flex size-5 shrink-0 items-center justify-center rounded-[4px]',
        state === 'unchecked' &&
          'border-[1.5px] border-muted-foreground bg-transparent',
        state === 'selected' &&
          'border-[1.5px] border-foreground bg-foreground',
        state === 'bound' &&
          'border-[1.5px] border-wallet-text-tertiary bg-wallet-text-tertiary',
      )}
      aria-hidden
    >
      {state === 'selected' || state === 'bound' ? (
        <IconCheck className="size-2.5 text-background" />
      ) : null}
    </span>
  );
}

function isSameIdSet(left: string[], right: string[]) {
  if (left.length !== right.length) {
    return false;
  }

  const rightSet = new Set(right);

  return left.every((id) => rightSet.has(id));
}

export type DramaFlowRoleActorSelectionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (actorCollectionIds: string[]) => void;
  boundActorCollectionIds: string[];
  /** 编辑态 baseline 已绑定 ID：不可取消勾选；创建态传空 */
  lockedActorCollectionIds?: string[];
  maxSelectable: number;
};

export function DramaFlowRoleActorSelectionDialog({
  open,
  onOpenChange,
  onConfirm,
  boundActorCollectionIds,
  lockedActorCollectionIds = [],
  maxSelectable,
}: DramaFlowRoleActorSelectionDialogProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [initialBoundIds, setInitialBoundIds] = useState<string[]>([]);

  const {
    data: collectionsResponse,
    isLoading,
    isError,
  } = useOwnedActorCollections({
    query: {
      enabled: open,
    },
  });

  // 打开时带入当前已绑定 ID；锁定集始终并入已选，避免编辑态漏掉 baseline。
  useEffect(() => {
    if (open) {
      const merged = Array.from(
        new Set([...boundActorCollectionIds, ...lockedActorCollectionIds]),
      );
      setSelectedIds(merged);
      setInitialBoundIds(merged);
    }
  }, [open, boundActorCollectionIds, lockedActorCollectionIds]);

  const collections =
    unwrapOrvalPayload<ActorCollectionResponse[]>(collectionsResponse) ?? [];

  const lockedIdSet = new Set(lockedActorCollectionIds);
  const hasSelectionChanges = !isSameIdSet(selectedIds, initialBoundIds);
  const isEmpty = !isLoading && !isError && collections.length === 0;

  const handleCancel = () => {
    onOpenChange(false);
  };

  const handleConfirm = () => {
    if (!hasSelectionChanges) {
      return;
    }

    // 确认结果始终包含锁定 ID，防止编辑态误删 baseline 绑定。
    const nextIds = Array.from(
      new Set([...selectedIds, ...lockedActorCollectionIds]),
    );
    onConfirm(nextIds);
    onOpenChange(false);
  };

  const handleGoToActorMarket = () => {
    onOpenChange(false);
    void navigate({ to: '/actor' });
  };

  // 切换勾选：锁定 ID 禁止取消；新增受总数上限约束。
  const handleToggleCollection = (collectionId: string) => {
    const isAlreadySelected = selectedIds.includes(collectionId);

    if (isAlreadySelected && lockedIdSet.has(collectionId)) {
      return;
    }

    if (!isAlreadySelected && selectedIds.length >= maxSelectable) {
      const remain = Math.max(0, maxSelectable - selectedIds.length);
      toast.error(
        t('最多还能选择 {{count}} 个角色 IP', {
          count: remain,
        }),
      );
      return;
    }

    setSelectedIds((prev) => {
      if (prev.includes(collectionId)) {
        return prev.filter((id) => id !== collectionId);
      }

      return [...prev, collectionId];
    });
  };

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('选择角色 IP')}
      width={600}
    >
      {isEmpty ? (
        <div
          className={cn(
            'flex flex-col items-center justify-center',
            'gap-6 px-10 py-14',
            'rounded-xl',
          )}
        >
          <div className="flex w-52 flex-col items-center gap-4">
            <IconNoData className="size-22 shrink-0" />
            <p className="w-full text-center text-sm leading-5 text-muted-foreground">
              {t('暂无数据')}
            </p>
          </div>
          <Button
            type="button"
            onClick={handleGoToActorMarket}
            className={cn(
              'h-11 gap-2 rounded-xl bg-foreground px-8 py-2.5',
              'text-sm leading-5 font-medium text-background',
              'hover:bg-foreground/90',
            )}
          >
            {t('前往角色IP市场')}
            <IconArrowRight className="size-5 shrink-0" />
          </Button>
        </div>
      ) : (
        <AppLoadingContainer
          data={collections}
          isLoading={isLoading}
          isError={isError}
          minHeight={258}
          emptyDescription={t('暂无数据')}
        >
          <ul className={cn('grid w-full grid-cols-1 gap-3', 'md:grid-cols-2')}>
            {collections.map((collection) => {
              const collectionId = readSnowflakeId(collection.id);
              if (!collectionId) {
                return null;
              }

              const isLocked = lockedIdSet.has(collectionId);
              const isSelected = selectedIds.includes(collectionId);
              const actorIpValue = collectionId;
              const listKey = collectionId;
              const checkboxState: IpSelectCheckboxProps['state'] = isSelected
                ? isLocked
                  ? 'bound'
                  : 'selected'
                : 'unchecked';

              return (
                <li key={listKey}>
                  <button
                    type="button"
                    disabled={isLocked && isSelected}
                    onClick={() => handleToggleCollection(collectionId)}
                    className={cn(
                      'flex w-full items-center',
                      'h-19.5 gap-3 p-4',
                      'rounded-xl text-left transition-colors',
                      isSelected
                        ? 'bg-[color-mix(in_srgb,rgb(0_168_56)_5%,var(--color-muted))]'
                        : 'bg-muted',
                      isLocked && isSelected
                        ? 'cursor-not-allowed'
                        : 'hover:opacity-90',
                    )}
                  >
                    <IpSelectCheckbox state={checkboxState} />
                    <img
                      src={collection.avatarUrl ?? ''}
                      alt=""
                      className={cn(
                        'size-11 shrink-0 rounded-lg object-cover',
                        'bg-muted',
                      )}
                    />
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <div className="flex min-w-0 items-center gap-1">
                        <span
                          className={cn(
                            'truncate text-base leading-6 font-bold tracking-normal',
                            'text-foreground',
                          )}
                        >
                          {collection.name}
                        </span>
                        {isLocked && isSelected ? (
                          <span
                            className={cn(
                              'shrink-0 rounded px-1 py-0.5',
                              'bg-background text-xs leading-4 font-normal tracking-[0.04px]',
                              'text-index-referral-rank-gold',
                            )}
                          >
                            {t('已绑定')}
                          </span>
                        ) : null}
                      </div>
                      {actorIpValue ? (
                        <p
                          className={cn(
                            'truncate text-sm leading-5 font-normal tracking-normal',
                            'text-muted-foreground',
                          )}
                        >
                          {t('IP {{code}}', {
                            code: formatActorIpDisplay(actorIpValue),
                          })}
                        </p>
                      ) : null}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </AppLoadingContainer>
      )}

      {/* 与经营玩法规则弹窗一致：贴底 sticky，滚动列表时底部操作栏始终可见 */}
      <footer
        className={cn(
          'sticky bottom-0 z-10 flex shrink-0 items-end justify-between',
          // 抵消 AppDialog 默认 bodyClassName=px-6 pb-6，贴齐滚动区底边
          '-mx-6 -mb-6 mt-6 w-[calc(100%+3rem)] gap-4',
          'border-t border-border bg-background px-6 py-4',
        )}
      >
        <p className="shrink-0 text-sm leading-5 font-bold text-foreground">
          {t('已选 {{count}} 个', { count: selectedIds.length })}
        </p>
        <div className="flex shrink-0 items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            className={cn(
              'h-11 rounded-xl border-border px-8 py-2.5',
              'text-sm leading-5 font-bold text-foreground',
            )}
          >
            {t('取消')}
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!hasSelectionChanges}
            className={cn(
              'h-11 rounded-xl px-8 py-2.5',
              'text-sm leading-5 font-bold text-background',
              hasSelectionChanges
                ? 'bg-foreground hover:bg-foreground/90'
                : 'bg-muted-foreground/40 hover:bg-muted-foreground/40',
            )}
          >
            {t('确认绑定')}
          </Button>
        </div>
      </footer>
    </AppDialog>
  );
}
