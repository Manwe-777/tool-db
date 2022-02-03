import getCrypto from "../../getCrypto";

import base64ToHex from "../base64ToHex";
import hexToArrayBuffer from "../hexToArrayBuffer";
import exportKeyAsHex from "./exportKeyAsHex";
import importKey from "./importKey";

export default function base64PublicKeyToHex(key: string): Promise<string> {
  return new Promise((resolve) => {
    const debasedKey = hexToArrayBuffer(base64ToHex(key));
    return importKey(debasedKey, "spki", "ECDSA", ["verify"]).then((skpub) => {
      return exportKeyAsHex(skpub).then((pk) => {
        const publicHexed = pk;
        resolve(publicHexed);
      });
    });
  });
}
