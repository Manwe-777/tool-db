import { bech32 } from "@scure/base";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils";

// Bech32 encoding of keys, as defined in NIP-19

const encode = (prefix: string, hex: string) =>
  bech32.encode(prefix, bech32.toWords(hexToBytes(hex)));

const decode = (prefix: string, value: string) => {
  const { prefix: actual, words } = bech32.decode(
    value as `${string}1${string}`
  );
  if (actual !== prefix) {
    throw new Error(`Invalid prefix ${actual}, expected ${prefix}`);
  }
  return bytesToHex(new Uint8Array(bech32.fromWords(words)));
};

export const npubEncode = (publicKey: string) => encode("npub", publicKey);

export const npubDecode = (npub: string) => decode("npub", npub);

export const nsecEncode = (secretKey: string) => encode("nsec", secretKey);

export const nsecDecode = (nsec: string) => decode("nsec", nsec);

/**
 * Accepts a secret key as hex or nsec, returns it as hex
 */
export function normalizeSecretKey(secretKey: string): string {
  const hex = secretKey.startsWith("nsec1") ? nsecDecode(secretKey) : secretKey;
  if (!/^[0-9a-f]{64}$/.test(hex)) {
    throw new Error("Invalid secret key");
  }
  return hex;
}
