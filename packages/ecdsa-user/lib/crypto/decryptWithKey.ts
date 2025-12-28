import {
  arrayBufferToString,
  hexToArrayBuffer,
  base64ToUint8,
} from "tool-db";

import getCrypto from "./getCrypto";

import { EncryptedData } from "./encryptWithKey";

/**
 * Decrypt a message using AES-GCM with the provided key.
 *
 * @param encrypted - Encrypted data with IV and ciphertext
 * @param key - AES-GCM CryptoKey (256-bit)
 * @returns Decrypted plaintext message
 */
export default async function decryptWithKey(
  encrypted: EncryptedData,
  key: CryptoKey
): Promise<string> {
  const crypto = getCrypto();
  const iv = base64ToUint8(encrypted.iv);

  const ciphertext = new Uint8Array(hexToArrayBuffer(encrypted.ct));
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext
  );

  return arrayBufferToString(decrypted);
}

