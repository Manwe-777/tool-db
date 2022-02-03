import { sha256, signData, arrayBufferToHex } from "..";

export default function getPeerSignature(
  privateKey: CryptoKey,
  topic: string,
  timestamp: number,
  host: string,
  port: number
) {
  const dataToSign = sha256(`${topic}-${timestamp}-${host}:${port}`);

  return signData(dataToSign, privateKey).then(arrayBufferToHex);
}
