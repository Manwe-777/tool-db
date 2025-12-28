import { arrayBufferToHex } from "tool-db";

import exportKey from "./exportKey";

export default function cryptoKeyPairToHexed(
  keys: globalThis.CryptoKeyPair
): Promise<{ pub: string; priv: string }> {
  return exportKey("spki", keys.publicKey as CryptoKey).then((rawPublic) =>
    exportKey("pkcs8", keys.privateKey as CryptoKey).then((rawPrivate) => {
      return {
        pub: arrayBufferToHex(rawPublic as ArrayBuffer),
        priv: arrayBufferToHex(rawPrivate as ArrayBuffer),
      };
    })
  );
}
