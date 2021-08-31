import { ParsedKeys } from "../../types/graph";
import catchReturn from "../catchReturn";
import decodeKeyString from "./decodeKeyString";
import importKey from "./importKey";

async function importKeys(parsedKeys: ParsedKeys) {
  const skpub = await importKey(
    decodeKeyString(parsedKeys.skpub),
    "spki",
    "ECDSA",
    ["verify"]
  ).catch(catchReturn);

  const skpriv = await importKey(
    decodeKeyString(parsedKeys.skpriv),
    "pkcs8",
    "ECDSA",
    ["sign"]
  ).catch(catchReturn);

  const ekpub = await importKey(
    decodeKeyString(parsedKeys.ekpub),
    "spki",
    "ECDH",
    []
  ).catch(catchReturn);

  const ekpriv = await importKey(
    decodeKeyString(parsedKeys.ekpriv),
    "pkcs8",
    "ECDH",
    ["deriveKey", "deriveBits"]
  ).catch(catchReturn);

  return { skpub, skpriv, ekpub, ekpriv };
}

export default function loadKeysComb(): Promise<
  | {
      signKeys: CryptoKeyPair;
      encryptionKeys: CryptoKeyPair;
    }
  | undefined
> {
  return new Promise((resolve, reject) => {
    const jsonKeys = localStorage.getItem("keys");

    if (jsonKeys) {
      const parsedKeys: ParsedKeys = JSON.parse(jsonKeys);

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
    } else {
      reject(new Error("No keys found in localStorage"));
    }
  });
}
