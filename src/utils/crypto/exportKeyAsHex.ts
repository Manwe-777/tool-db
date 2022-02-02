import arrayBufferToHex from "../arrayBufferToHex";

export default function exportKeyAsHex(key: CryptoKey) {
  return new Promise<string>((resolve) => {
    crypto.subtle.exportKey("raw", key).then((pk) => {
      const publicHexed = arrayBufferToHex(pk);
      resolve(publicHexed);
    });
  });
}
