import { hexToArrayBuffer } from "tool-db";

import getCrypto from "./getCrypto";

/**
 * Import a raw AES-GCM key from hex format.
 *
 * @param hexKey - The key as a hex string (should be 64 chars for 256-bit)
 * @returns CryptoKey for AES-GCM operations
 */
export default async function importAESKey(hexKey: string): Promise<CryptoKey> {
  const crypto = getCrypto();
  const keyData = new Uint8Array(hexToArrayBuffer(hexKey));

  return crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

