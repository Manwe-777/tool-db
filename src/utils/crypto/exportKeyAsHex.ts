import getCrypto from "../../getCrypto";
import arrayBufferToHex from "../encoding/arrayBufferToHex";

export default function exportKeyAsHex(key: CryptoKey) {
  const crypto = getCrypto();

  return new Promise<string>((resolve) => {
    crypto.subtle.exportKey("raw", key).then((pk) => {
      const hexedKey = arrayBufferToHex(pk);
      resolve(hexedKey);
    });
  });
}
