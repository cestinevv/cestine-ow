import {
  Ed25519Program,
  PublicKey,
  type TransactionInstruction,
} from '@solana/web3.js';
import bs58 from 'bs58';
import { Buffer } from 'buffer';

const ED25519_SIGNATURE_BYTES = 64;
const HEX_SIGNATURE_RE = /^(?:0x)?[0-9a-fA-F]{128}$/;
const BASE64_SIGNATURE_RE = /^[A-Za-z0-9+/]+={0,2}$/;
const BASE64_URL_SIGNATURE_RE = /^[A-Za-z0-9_-]+={0,2}$/;

function normalizeBase64Url(value: string): string {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = (4 - (base64.length % 4)) % 4;

  return `${base64}${'='.repeat(padding)}`;
}

function decodeDelegatorSignatureBytes(signature: string): Uint8Array {
  const normalized = signature.trim().replace(/\s/g, '');

  if (HEX_SIGNATURE_RE.test(normalized)) {
    return new Uint8Array(Buffer.from(normalized.replace(/^0x/i, ''), 'hex'));
  }

  if (BASE64_SIGNATURE_RE.test(normalized)) {
    const bytes = Buffer.from(normalized, 'base64');
    if (bytes.length === ED25519_SIGNATURE_BYTES) {
      return new Uint8Array(bytes);
    }
  }

  if (BASE64_URL_SIGNATURE_RE.test(normalized)) {
    const bytes = Buffer.from(normalizeBase64Url(normalized), 'base64');
    if (bytes.length === ED25519_SIGNATURE_BYTES) {
      return new Uint8Array(bytes);
    }
  }

  return bs58.decode(normalized);
}

/** API `sig` 字段：hex/base64/base64url/base58 → Ed25519 原始 64 字节。 */
export function decodeDelegatorSigBase64(sigBase64: string): Uint8Array {
  const bytes = decodeDelegatorSignatureBytes(sigBase64);

  if (bytes.length !== ED25519_SIGNATURE_BYTES) {
    throw new Error(`sig 解码后须为 64 字节，实际 ${bytes.length} 字节`);
  }

  return new Uint8Array(bytes);
}

/** 与 Java `SHA256(canonicalPayload.getBytes(UTF_8))` 一致 */
export async function sha256CanonicalPayloadUtf8(
  canonicalPayload: string,
): Promise<Uint8Array> {
  const data = new TextEncoder().encode(canonicalPayload);
  return new Uint8Array(await crypto.subtle.digest('SHA-256', data));
}

/** Ed25519 预编译验签指令（须作为 mint 指令的前一条） */
export async function createDelegatorEd25519Instruction(params: {
  delegator: string;
  canonicalPayload: string;
  sig64: Uint8Array;
}): Promise<TransactionInstruction> {
  const msgHash = await sha256CanonicalPayloadUtf8(params.canonicalPayload);

  return Ed25519Program.createInstructionWithPublicKey({
    publicKey: new PublicKey(params.delegator).toBytes(),
    message: msgHash,
    signature: Buffer.from(params.sig64),
  });
}
