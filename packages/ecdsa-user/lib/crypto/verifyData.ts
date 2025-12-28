import { stringToArrayBuffer } from "tool-db";

import getCrypto from "./getCrypto";

export default function verifyData(
  data: string,
  signature: ArrayBuffer,
  publicKey: CryptoKey,
  hashName = "SHA-256"
) {
  const crypto = getCrypto();
  const dataBytes = new Uint8Array(stringToArrayBuffer(data));
  const signatureBytes = new Uint8Array(signature);
  return crypto.subtle.verify(
    {
      name: "ECDSA",
      hash: { name: hashName }, // can be "SHA-1", "SHA-256", "SHA-384", or "SHA-512"
    },
    publicKey, // from generateKey or importKey above
    signatureBytes, // Uint8Array of the signature
    dataBytes // Uint8Array of the data
  );
}
