import { createContext, useContext } from 'react';

import type { DramaFlowDocument } from '@/features/drama-flow/types/dramaFlowDocument';

export type DramaFlowMode = 'create' | 'edit';

export type DramaFlowConfigContextValue = {
  mode: DramaFlowMode;
  /** 编辑模式：路由 dramaId 字符串，提交与加载 API 的唯一 ID 来源 */
  dramaId?: string;
  /** 编辑模式：edit-context 初始快照，用于增量 diff */
  baselineDocument?: DramaFlowDocument;
};

export const DramaFlowConfigContext =
  createContext<DramaFlowConfigContextValue | null>(null);

export function useDramaFlowConfig() {
  const context = useContext(DramaFlowConfigContext);
  if (!context) {
    throw new Error(
      'useDramaFlowConfig must be used within a DramaFlowConfigContext.Provider',
    );
  }
  return context;
}
