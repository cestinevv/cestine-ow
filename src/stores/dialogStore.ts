import { create } from 'zustand';

interface DialogState {
  depositDialogOpen: boolean;
  withdrawDialogOpen: boolean;
  insufficientUsdcDialogOpen: boolean;
  /** 预检缺口金额（USDC 字符串，展示前再 formatNumber） */
  insufficientUsdcShortfall: string;
  openDepositDialog: () => void;
  closeDepositDialog: () => void;
  openWithdrawDialog: () => void;
  closeWithdrawDialog: () => void;
  openInsufficientUsdcDialog: (shortfall: string) => void;
  closeInsufficientUsdcDialog: () => void;
}

export const useDialogStore = create<DialogState>((set) => ({
  depositDialogOpen: false,
  withdrawDialogOpen: false,
  insufficientUsdcDialogOpen: false,
  insufficientUsdcShortfall: '',
  openDepositDialog: () => set({ depositDialogOpen: true }),
  closeDepositDialog: () => set({ depositDialogOpen: false }),
  openWithdrawDialog: () => set({ withdrawDialogOpen: true }),
  closeWithdrawDialog: () => set({ withdrawDialogOpen: false }),
  openInsufficientUsdcDialog: (shortfall) =>
    set({
      insufficientUsdcDialogOpen: true,
      insufficientUsdcShortfall: shortfall,
    }),
  closeInsufficientUsdcDialog: () =>
    set({
      insufficientUsdcDialogOpen: false,
      insufficientUsdcShortfall: '',
    }),
}));
