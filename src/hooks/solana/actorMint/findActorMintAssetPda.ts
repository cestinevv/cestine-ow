import type { Address, ProgramDerivedAddress } from '@solana/kit';
import { PublicKey } from '@solana/web3.js';
import { Buffer } from 'buffer';

export async function findActorMintAssetPda(
  seeds: { assetId: string },
  config: { programAddress?: Address | undefined } = {},
): Promise<ProgramDerivedAddress> {
  if (!config.programAddress) {
    throw new Error('programAddress is required to derive actor_mint PDA');
  }

  const [pda, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from('actor_mint'), Buffer.from(seeds.assetId)],
    new PublicKey(config.programAddress),
  );

  return [pda.toBase58() as Address, bump] as unknown as ProgramDerivedAddress;
}
