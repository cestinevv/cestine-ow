import type { Commitment, SimulateTransactionConfig } from '@solana/web3.js';

export const ACTOR_MINT_BLOCKHASH_COMMITMENT: Commitment = 'finalized';

export const ACTOR_MINT_SIMULATION_CONFIG = {
  sigVerify: false,
  replaceRecentBlockhash: true,
} satisfies SimulateTransactionConfig;
