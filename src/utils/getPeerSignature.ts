import { arrayBufferToBase64, sha256, signData, toBase64 } from "..";

export default function getPeerSignature(
  privateKey: CryptoKey,
  topic: string,
  timestamp: number,
  host: string,
  port: number
) {
  const dataToSign = sha256(`${topic}-${timestamp}-${host}:${port}`);

  return signData(dataToSign, privateKey, "SHA-1").then(arrayBufferToBase64);
}
