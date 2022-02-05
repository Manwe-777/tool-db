import sha256 from "./sha256";
import signData from "./signData";
import arrayBufferToHex from "./encoding/arrayBufferToHex";

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
