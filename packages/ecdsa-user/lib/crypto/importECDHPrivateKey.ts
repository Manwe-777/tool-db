import { hexToArrayBuffer } from "tool-db";

import getCrypto from "./getCrypto";

/**
 * Import a private key from hex format for ECDH operations.
 * The key should be in PKCS8 format encoded as hex.
 */
export default async function importECDHPrivateKey(
  hexKey: string
): Promise<CryptoKey> {
  const crypto = getCrypto();
  const keyData = new Uint8Array(hexToArrayBuffer(hexKey));

  return crypto.subtle.importKey(
    "pkcs8",
    keyData,
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey", "deriveBits"]
  );
}

