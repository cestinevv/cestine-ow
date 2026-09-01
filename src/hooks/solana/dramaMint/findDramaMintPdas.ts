import type { Address, ProgramDerivedAddress } from '@solana/kit';
import { PublicKey } from '@solana/web3.js';
import { Buffer } from 'buffer';

function findPda(
  seeds: Buffer[],
  programAddress: Address | undefined,
): ProgramDerivedAddress {
  if (!programAddress) {
    throw new Error('programAddress is required to derive drama mint PDA');
  }

  const [pda, bump] = PublicKey.findProgramAddressSync(
    seeds,
    new PublicKey(programAddress),
  );

  return [pda.toBase58() as Address, bump] as unknown as ProgramDerivedAddress;
}

export async function findDramaMintAssetPda(
  seeds: { dramaId: number | bigint },
  config: { programAddress?: Address | undefined } = {},
): Promise<ProgramDerivedAddress> {
  const dramaIdBytes = Buffer.alloc(8);
  dramaIdBytes.writeBigUInt64LE(BigInt(seeds.dramaId));

  return findPda(
    [Buffer.from('drama_mint'), dramaIdBytes],
    config.programAddress,
  );
}

export async function findDramaCollectionInfoPda(
  seeds: { collectionType: string },
  config: { programAddress?: Address | undefined } = {},
): Promise<ProgramDerivedAddress> {
  return findPda(
    [Buffer.from('collection_info'), Buffer.from(seeds.collectionType)],
    config.programAddress,
  );
}

export async function findDramaCollectionMintPda(
  seeds: { collectionType: string },
  config: { programAddress?: Address | undefined } = {},
): Promise<ProgramDerivedAddress> {
  return findPda(
    [Buffer.from('collection_mint'), Buffer.from(seeds.collectionType)],
    config.programAddress,
  );
}
