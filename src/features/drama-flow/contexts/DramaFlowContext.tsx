import { createContext, useContext } from 'react';
import type { StoreApi } from 'zustand';
import type { DramaFlowStoreState } from '../types/dramaFlowStore';

export const DramaFlowContext =
  createContext<StoreApi<DramaFlowStoreState> | null>(null);

export function useDramaFlowStoreContext() {
  const context = useContext(DramaFlowContext);
  if (!context) {
    throw new Error(
      'useDramaFlowStoreContext must be used within a DramaFlowContext.Provider',
    );
  }
  return context;
}
