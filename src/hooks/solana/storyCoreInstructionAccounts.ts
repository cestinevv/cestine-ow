import type { Address } from '@solana/kit';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import {
  type AccountMeta,
  PublicKey,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  SystemProgram,
} from '@solana/web3.js';

export const MPL_CORE_PROGRAM_ID = new PublicKey(
  'CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d',
);

function readonly(pubkey: PublicKey): AccountMeta {
  return { pubkey, isSigner: false, isWritable: false };
}

function writable(pubkey: PublicKey): AccountMeta {
  return { pubkey, isSigner: false, isWritable: true };
}

export function buildCreateActorCollectionCoreAccountMetas(params: {
  creator: PublicKey;
  sponor: PublicKey;
  configPda: Address;
  collection: PublicKey;
  collectionInfo: Address;
  payTokenMint: PublicKey;
  creatorPayAccount: PublicKey;
  treasuryTokenAccount: PublicKey;
}): AccountMeta[] {
  return [
    { pubkey: params.creator, isSigner: true, isWritable: true },
    { pubkey: params.sponor, isSigner: true, isWritable: true },
    readonly(new PublicKey(params.configPda)),
    writable(params.collection),
    writable(new PublicKey(params.collectionInfo)),
    readonly(params.payTokenMint),
    writable(params.creatorPayAccount),
    writable(params.treasuryTokenAccount),
    readonly(SYSVAR_INSTRUCTIONS_PUBKEY),
    readonly(MPL_CORE_PROGRAM_ID),
    readonly(SystemProgram.programId),
    readonly(TOKEN_PROGRAM_ID),
  ];
}

export function buildBatchMintActorNftCoreAccountMetas(params: {
  creator: PublicKey;
  sponor: PublicKey;
  configPda: Address;
  collectionInfo: Address;
  collectionMint: PublicKey;
  payTokenMint: PublicKey;
  creatorPayAccount: PublicKey;
  treasuryTokenAccount: PublicKey;
  remainingAccounts: AccountMeta[];
}): AccountMeta[] {
  return [
    { pubkey: params.creator, isSigner: true, isWritable: true },
    { pubkey: params.sponor, isSigner: true, isWritable: true },
    writable(new PublicKey(params.configPda)),
    writable(new PublicKey(params.collectionInfo)),
    writable(params.collectionMint),
    readonly(params.payTokenMint),
    writable(params.creatorPayAccount),
    writable(params.treasuryTokenAccount),
    readonly(SYSVAR_INSTRUCTIONS_PUBKEY),
    readonly(MPL_CORE_PROGRAM_ID),
    readonly(SystemProgram.programId),
    readonly(TOKEN_PROGRAM_ID),
    ...params.remainingAccounts,
  ];
}

export function buildCreateCollectionCoreAccountMetas(params: {
  admin: PublicKey;
  configPda: Address;
  collection: PublicKey;
  collectionInfo: Address;
}): AccountMeta[] {
  return [
    { pubkey: params.admin, isSigner: true, isWritable: true },
    readonly(new PublicKey(params.configPda)),
    writable(params.collection),
    writable(new PublicKey(params.collectionInfo)),
    readonly(MPL_CORE_PROGRAM_ID),
    readonly(SystemProgram.programId),
  ];
}

export function buildMintSeriesNftCoreAccountMetas(params: {
  creator: PublicKey;
  sponor: PublicKey;
  configPda: Address;
  asset: PublicKey;
  dramaCollectionInfo: Address;
  collectionMint: PublicKey;
  payTokenMint: PublicKey;
  creatorPayAccount: PublicKey;
  treasuryTokenAccount: PublicKey;
}): AccountMeta[] {
  return [
    { pubkey: params.creator, isSigner: true, isWritable: true },
    { pubkey: params.sponor, isSigner: true, isWritable: true },
    readonly(new PublicKey(params.configPda)),
    writable(params.asset),
    readonly(new PublicKey(params.dramaCollectionInfo)),
    writable(params.collectionMint),
    readonly(params.payTokenMint),
    writable(params.creatorPayAccount),
    writable(params.treasuryTokenAccount),
    readonly(SYSVAR_INSTRUCTIONS_PUBKEY),
    readonly(MPL_CORE_PROGRAM_ID),
    readonly(SystemProgram.programId),
    readonly(TOKEN_PROGRAM_ID),
  ];
}
