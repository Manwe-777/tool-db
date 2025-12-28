import { hexToArrayBuffer } from "tool-db";

import getCrypto from "./getCrypto";

/**
 * Import a public key from hex format for ECDH operations.
 * The key should be in SPKI format encoded as hex.
 */
export default async function importECDHPublicKey(
  hexKey: string
): Promise<CryptoKey> {
  const crypto = getCrypto();
  const keyData = new Uint8Array(hexToArrayBuffer(hexKey));

  return crypto.subtle.importKey(
    "spki",
    keyData,
    { name: "ECDH", namedCurve: "P-256" },
    true,
    []
  );
}

