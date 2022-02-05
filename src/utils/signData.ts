import getCrypto from "../getCrypto";
import stringToArrayBuffer from "./stringToArrayBuffer";

export default function signData(
  data: string,
  privateKey: CryptoKey,
  hashName = "SHA-256"
) {
  const crypto = getCrypto();
  return crypto.subtle.sign(
    {
      name: "ECDSA",
      hash: { name: hashName }, // can be "SHA-1", "SHA-256", "SHA-384", or "SHA-512"
    },
    privateKey, // from generateKey or importKey above
    stringToArrayBuffer(data) // ArrayBuffer of data you want to sign
  );
}
