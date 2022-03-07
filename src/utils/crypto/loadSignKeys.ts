import { Keys } from "../../types/tooldb";
import catchReturn from "../catchReturn";
import decodeKeyString from "./decodeKeyString";
import importKey from "./importKey";

async function importKeys(parsedKeys: Keys) {
  const skpub = await importKey(
    decodeKeyString(parsedKeys.pub),
    "spki",
    "ECDSA",
    ["verify"]
  ).catch(catchReturn);

  const skpriv = await importKey(
    decodeKeyString(parsedKeys.priv),
    "pkcs8",
    "ECDSA",
    ["sign"]
  ).catch(catchReturn);

  return { skpub, skpriv };
}

export default function loadKeysComb(
  parsedKeys: Keys
): Promise<CryptoKeyPair | undefined> {
  return new Promise((resolve, reject) => {
    importKeys(parsedKeys).then(({ skpub, skpriv }) => {
      if (!skpub || !skpriv) {
        reject(new Error("Could not import keys"));
      } else {
        resolve({
          publicKey: skpub,
          privateKey: skpriv,
        });
      }
    });
  });
}
