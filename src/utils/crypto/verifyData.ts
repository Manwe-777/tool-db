import getCrypto from "../../getCrypto";
import stringToArrayBuffer from "../stringToArrayBuffer";

export default function verifyData(
  data: string,
  signature: ArrayBuffer,
  publicKey: CryptoKey,
  hashName = "SHA-256"
) {
  const crypto = getCrypto();
  return crypto.subtle.verify(
    {
      name: "ECDSA",
      hash: { name: hashName }, // can be "SHA-1", "SHA-256", "SHA-384", or "SHA-512"
    },
    publicKey, // from generateKey or importKey above
    signature, // ArrayBuffer of the signature
    stringToArrayBuffer(data) // ArrayBuffer of the data
  );
}
