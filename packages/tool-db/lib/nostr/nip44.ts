import { chacha20 } from "@noble/ciphers/chacha";
import { equalBytes } from "@noble/ciphers/utils";
import { secp256k1 } from "@noble/curves/secp256k1";
import { expand, extract } from "@noble/hashes/hkdf";
import { hmac } from "@noble/hashes/hmac";
import { sha256 } from "@noble/hashes/sha256";
import {
  bytesToHex,
  concatBytes,
  hexToBytes,
  randomBytes,
} from "@noble/hashes/utils";
import { base64 } from "@scure/base";

// Encrypted payloads, as defined in NIP-44 (version 2)

const VERSION = 2;
const MIN_PLAINTEXT_SIZE = 1;
const MAX_PLAINTEXT_SIZE = 65535;

const utf8Encoder = new TextEncoder();
const utf8Decoder = new TextDecoder();

/**
 * The shared key between two keys, the same from both sides
 * @param secretKey our secret key (hex)
 * @param publicKey their public key (hex)
 * @returns hex conversation key
 */
export function getConversationKey(
  secretKey: string,
  publicKey: string
): string {
  const sharedX = secp256k1
    .getSharedSecret(hexToBytes(secretKey), hexToBytes("02" + publicKey))
    .subarray(1, 33);
  return bytesToHex(extract(sha256, sharedX, "nip44-v2"));
}

function getMessageKeys(conversationKey: Uint8Array, nonce: Uint8Array) {
  const keys = expand(sha256, conversationKey, nonce, 76);
  return {
    chachaKey: keys.subarray(0, 32),
    chachaNonce: keys.subarray(32, 44),
    hmacKey: keys.subarray(44, 76),
  };
}

/**
 * Length of the padded plaintext, so messages only leak a rough size
 */
export function calcPaddedLen(length: number): number {
  if (!Number.isSafeInteger(length) || length < 1) {
    throw new Error("Expected a positive integer");
  }
  if (length <= 32) return 32;
  const nextPower = 1 << (Math.floor(Math.log2(length - 1)) + 1);
  const chunk = nextPower <= 256 ? 32 : nextPower / 8;
  return chunk * (Math.floor((length - 1) / chunk) + 1);
}

function pad(plaintext: string): Uint8Array {
  const unpadded = utf8Encoder.encode(plaintext);
  const length = unpadded.length;
  if (length < MIN_PLAINTEXT_SIZE || length > MAX_PLAINTEXT_SIZE) {
    throw new Error("Invalid plaintext length");
  }
  return concatBytes(
    Uint8Array.from([length >> 8, length & 0xff]),
    unpadded,
    new Uint8Array(calcPaddedLen(length) - length)
  );
}

function unpad(padded: Uint8Array): string {
  const length = (padded[0] << 8) | padded[1];
  const unpadded = padded.subarray(2, 2 + length);
  if (
    length < MIN_PLAINTEXT_SIZE ||
    unpadded.length !== length ||
    padded.length !== 2 + calcPaddedLen(length)
  ) {
    throw new Error("Invalid padding");
  }
  return utf8Decoder.decode(unpadded);
}

const getMac = (key: Uint8Array, nonce: Uint8Array, ciphertext: Uint8Array) =>
  hmac(sha256, key, concatBytes(nonce, ciphertext));

/**
 * Encrypts a message with a conversation key
 * @param nonce 32 bytes hex, random by default (only set it for tests)
 * @returns base64 payload
 */
export function nip44Encrypt(
  plaintext: string,
  conversationKey: string,
  nonce?: string
): string {
  const nonceBytes = nonce ? hexToBytes(nonce) : randomBytes(32);
  const { chachaKey, chachaNonce, hmacKey } = getMessageKeys(
    hexToBytes(conversationKey),
    nonceBytes
  );
  const ciphertext = chacha20(chachaKey, chachaNonce, pad(plaintext));
  return base64.encode(
    concatBytes(
      Uint8Array.from([VERSION]),
      nonceBytes,
      ciphertext,
      getMac(hmacKey, nonceBytes, ciphertext)
    )
  );
}

/**
 * Decrypts a payload with a conversation key
 * @throws if the payload is invalid or was not encrypted with this key
 */
export function nip44Decrypt(payload: string, conversationKey: string): string {
  if (typeof payload !== "string") throw new Error("Invalid payload");
  if (payload.length < 132 || payload.length > 87472) {
    throw new Error("Invalid payload length");
  }
  if (payload[0] === "#") throw new Error("Unknown encryption version");

  const data = base64.decode(payload);
  if (data.length < 99 || data.length > 65603) {
    throw new Error("Invalid data length");
  }
  if (data[0] !== VERSION) throw new Error("Unknown encryption version");

  const nonce = data.subarray(1, 33);
  const ciphertext = data.subarray(33, data.length - 32);
  const mac = data.subarray(data.length - 32);

  const { chachaKey, chachaNonce, hmacKey } = getMessageKeys(
    hexToBytes(conversationKey),
    nonce
  );
  if (!equalBytes(getMac(hmacKey, nonce, ciphertext), mac)) {
    throw new Error("Invalid MAC");
  }
  return unpad(chacha20(chachaKey, chachaNonce, ciphertext));
}
