import { stringToArrayBuffer } from "tool-db";

import getCrypto from "./getCrypto";

export default function signData(data: string, privateKey: CryptoKey) {
  const crypto = getCrypto();
  const dataBytes = new Uint8Array(stringToArrayBuffer(data));
  return crypto.subtle.sign(
    {
      name: "ECDSA",
      hash: { name: "SHA-256" }, // can be "SHA-1", "SHA-256", "SHA-384", or "SHA-512"
    },
    privateKey, // from generateKey or importKey above
    dataBytes // Uint8Array of data you want to sign
  );
}
