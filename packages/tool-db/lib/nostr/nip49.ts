import { xchacha20poly1305 } from "@noble/ciphers/chacha";
import { scryptAsync } from "@noble/hashes/scrypt";
import {
  bytesToHex,
  concatBytes,
  hexToBytes,
  randomBytes,
} from "@noble/hashes/utils";
import { bech32 } from "@scure/base";

// Password encrypted secret keys, as defined in NIP-49

const VERSION = 2;
const BECH32_LIMIT = 5000;

/**
 * Key security byte: 0x00 if the key was known to be handled insecurely,
 * 0x01 if not, 0x02 if unknown.
 */
export type KeySecurity = 0 | 1 | 2;

const deriveKey = (password: string, salt: Uint8Array, logN: number) =>
  scryptAsync(password.normalize("NFKC"), salt, {
    N: 2 ** logN,
    r: 8,
    p: 1,
    dkLen: 32,
  });

/**
 * Encrypts a hex secret key with a password
 * @param logN scrypt cost (2^logN), 16 takes ~100ms and 64MB of memory
 * @returns ncryptsec bech32 string
 */
export async function encryptSecretKey(
  secretKey: string,
  password: string,
  logN = 16,
  keySecurity: KeySecurity = 2
): Promise<string> {
  const salt = randomBytes(16);
  const nonce = randomBytes(24);
  const aad = Uint8Array.from([keySecurity]);
  const key = await deriveKey(password, salt, logN);
  const ciphertext = xchacha20poly1305(key, nonce, aad).encrypt(
    hexToBytes(secretKey)
  );
  const bytes = concatBytes(
    Uint8Array.from([VERSION, logN]),
    salt,
    nonce,
    aad,
    ciphertext
  );
  return bech32.encode("ncryptsec", bech32.toWords(bytes), BECH32_LIMIT);
}

/**
 * Decrypts an ncryptsec string with a password
 * @returns hex secret key
 */
export async function decryptSecretKey(
  ncryptsec: string,
  password: string
): Promise<string> {
  const { prefix, words } = bech32.decode(
    ncryptsec as `${string}1${string}`,
    BECH32_LIMIT
  );
  if (prefix !== "ncryptsec") {
    throw new Error(`Invalid prefix ${prefix}, expected ncryptsec`);
  }

  const bytes = new Uint8Array(bech32.fromWords(words));
  if (bytes[0] !== VERSION) {
    throw new Error(`Invalid version ${bytes[0]}, expected ${VERSION}`);
  }

  const logN = bytes[1];
  const salt = bytes.slice(2, 18);
  const nonce = bytes.slice(18, 42);
  const aad = bytes.slice(42, 43);
  const ciphertext = bytes.slice(43);

  const key = await deriveKey(password, salt, logN);
  return bytesToHex(xchacha20poly1305(key, nonce, aad).decrypt(ciphertext));
}
