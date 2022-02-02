import getCrypto from "../../getCrypto";
import arrayBufferToHex from "../arrayBufferToHex";
import base64ToHex from "../base64ToHex";
import hexToArrayBuffer from "../hexToArrayBuffer";
import importKey from "./importKey";

export default function base64KeyToHex(key: string): Promise<string> {
  return new Promise((resolve) => {
    const debasedKey = hexToArrayBuffer(base64ToHex(key));
    return importKey(debasedKey, "spki", "ECDSA", ["verify"]).then((skpub) => {
      const crypto = getCrypto();
      return crypto.subtle.exportKey("raw", skpub).then((pk) => {
        const publicHexed = arrayBufferToHex(pk);
        resolve(publicHexed);
      });
    });
  });
}
