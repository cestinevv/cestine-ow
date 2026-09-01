import { useStore } from 'zustand';
import { useDramaFlowStoreContext } from '../contexts/DramaFlowContext';
import type { DramaFlowStoreState } from '../types/dramaFlowStore';

export function useDramaFlowStore<T>(
  selector: (state: DramaFlowStoreState) => T,
): T {
  const store = useDramaFlowStoreContext();
  return useStore(store, selector);
}

export { useDramaFlowStoreContext };
