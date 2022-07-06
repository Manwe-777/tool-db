import stringToArrayBuffer from "../utils/stringToArrayBuffer";

import getCrypto from "./getCrypto";

export default function signData(data: string, privateKey: CryptoKey) {
  const crypto = getCrypto();
  return crypto.subtle.sign(
    {
      name: "ECDSA",
      hash: { name: "SHA-256" }, // can be "SHA-1", "SHA-256", "SHA-384", or "SHA-512"
    },
    privateKey, // from generateKey or importKey above
    stringToArrayBuffer(data) // ArrayBuffer of data you want to sign
  );
}
