import { ParsedKeys } from "../../types/graph";
import catchReturn from "../catchReturn";
import hexToArrayBuffer from "../hexToArrayBuffer";

import importKey from "./importKey";

async function importKeys(parsedKeys: ParsedKeys) {
  const skpriv = await importKey(
    hexToArrayBuffer(parsedKeys.skpriv),
    "pkcs8",
    "ECDSA",
    ["sign"]
  ).catch(catchReturn);

  const ekpriv = await importKey(
    hexToArrayBuffer(parsedKeys.ekpriv),
    "pkcs8",
    "ECDH",
    ["deriveKey", "deriveBits"]
  ).catch(catchReturn);

  const skpub = await importKey(
    hexToArrayBuffer(parsedKeys.skpub),
    "spki",
    "ECDSA",
    ["verify"]
  ).catch(catchReturn);

  const ekpub = await importKey(
    hexToArrayBuffer(parsedKeys.ekpub),
    "spki",
    "ECDH",
    []
  ).catch(catchReturn);

  return { skpub, skpriv, ekpub, ekpriv };
}

export default function loadKeysComb(parsedKeys: ParsedKeys): Promise<
  | {
      signKeys: CryptoKeyPair;
      encryptionKeys: CryptoKeyPair;
    }
  | undefined
> {
  return new Promise((resolve, reject) => {
    importKeys(parsedKeys).then(({ skpub, skpriv, ekpub, ekpriv }) => {
      if (!skpub || !skpriv || !ekpub || !ekpriv) {
        reject(new Error("Could not import keys"));
      } else {
        resolve({
          signKeys: {
            publicKey: skpub,
            privateKey: skpriv,
          },
          encryptionKeys: {
            publicKey: ekpub,
            privateKey: ekpriv,
          },
        });
      }
    });
  });
}
