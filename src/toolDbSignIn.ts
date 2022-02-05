import ToolDb from "./tooldb";

import decodeKeyString from "./utils/crypto/decodeKeyString";
import decryptWithPass from "./utils/crypto/decryptWithPass";
import exportKeyAsHex from "./utils/crypto/exportKeyAsHex";
import importKey from "./utils/crypto/importKey";
import catchReturn from "./utils/catchReturn";
import sha256 from "./utils/sha256";
import hexToUint8 from "./utils/encoding/hexToUint8";
import hexToArrayBuffer from "./utils/encoding/hexToArrayBuffer";
import { UserRootData } from "./types/graph";

export default function toolDbSignIn(
  this: ToolDb,
  user: string,
  password: string
): Promise<
  | {
      signKeys: CryptoKeyPair;
      encryptionKeys: CryptoKeyPair;
    }
  | undefined
> {
  return new Promise((resolve, reject) => {
    this.getData<UserRootData>(`==${user}`, false, 5000)
      .then((_user) => {
        if (!_user) {
          reject("Could not find user");
          return;
        }

        if (sha256(password) !== _user.pass) {
          reject("Invalid password");
          return;
        }

        decryptWithPass(
          hexToArrayBuffer(_user.keys.skpriv),
          password,
          hexToUint8(_user.iv)
        ).then((decryptedSKpriv) => {
          decryptWithPass(
            hexToArrayBuffer(_user.keys.ekpriv),
            password,
            hexToUint8(_user.iv)
          )
            .then((decryptedEKpriv) => {
              const parsedKeys = {
                ..._user.keys,
                skpriv: decryptedSKpriv || "",
                ekpriv: decryptedEKpriv || "",
              };

              // const jsonKeys = {
              //   skpub: parsedKeys.skpub,
              //   skpriv: parsedKeys.skpriv,
              //   ekpub: parsedKeys.ekpub,
              //   ekpriv: parsedKeys.ekpriv,
              // };
              // localStorage.setItem("keys", JSON.stringify(jsonKeys));

              async function importKeys() {
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

              importKeys()
                .then(async ({ skpub, skpriv, ekpub, ekpriv }) => {
                  if (!skpub || !skpriv || !ekpub || !ekpriv) {
                    reject(new Error("Could not import keys"));
                  } else {
                    const newKeys = {
                      signKeys: {
                        publicKey: skpub,
                        privateKey: skpriv,
                      },
                      encryptionKeys: {
                        publicKey: ekpub,
                        privateKey: ekpriv,
                      },
                    };

                    const pubKeyHex = await exportKeyAsHex(
                      newKeys.signKeys.publicKey
                    );

                    this.user = {
                      keys: newKeys,
                      name: user,
                      adress: pubKeyHex,
                    };
                    resolve(newKeys);
                  }
                })
                .catch(catchReturn);
            })
            .catch(catchReturn);
        });
      })
      .catch(console.warn);
  });
}
