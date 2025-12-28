import {
  stringToArrayBuffer,
  arrayBufferToHex,
  uint8ToBase64,
} from "tool-db";

import getCrypto from "./getCrypto";
import generateIv from "./generateIv";

export interface EncryptedData {
  iv: string; // base64 encoded IV
  ct: string; // hex encoded ciphertext
}

/**
 * Encrypt a message using AES-GCM with the provided key.
 *
 * @param message - Plaintext message to encrypt
 * @param key - AES-GCM CryptoKey (256-bit)
 * @returns Encrypted data with IV and ciphertext
 */
export default async function encryptWithKey(
  message: string,
  key: CryptoKey
): Promise<EncryptedData> {
  const crypto = getCrypto();
  const iv = generateIv();
  const plaintext = new Uint8Array(stringToArrayBuffer(message));

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    plaintext
  );

  return {
    iv: uint8ToBase64(iv),
    ct: arrayBufferToHex(ciphertext),
  };
}

