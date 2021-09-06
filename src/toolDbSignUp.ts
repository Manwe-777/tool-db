import toolDbClient from "./toolDbClient";
import { GraphEntryValue, UserRootData } from "./types/graph";

import encryptWithPass from "./utils/crypto/encryptWithPass";
import generateKeysComb from "./utils/crypto/generateKeysComb";
import saveKeysComb from "./utils/crypto/saveKeysComb";
import generateIv from "./utils/generateIv";
import proofOfWork from "./utils/proofOfWork";
import sha256 from "./utils/sha256";
import signData from "./utils/signData";
import toBase64 from "./utils/toBase64";
import uint8ToBase64 from "./utils/uint8ToBase64";

export default async function toolDbSignUp(
  this: toolDbClient,
  user: string,
  password: string
): Promise<any> {
  const userRoot = `==${user}`;
  return new Promise((resolve, reject) => {
    this.getData<UserRootData>(userRoot, false, 5000)
      .then((data) => {
        if (data === null) {
          generateKeysComb()
            .then((keys) => {
              if (keys) {
                saveKeysComb(keys.signKeys, keys.encryptionKeys)
                  .then((savedKeys) => {
                    const iv = generateIv();
                    let encskpriv = "";
                    let encekpriv = "";

                    // Encrypt sign key
                    encryptWithPass(savedKeys.skpriv, password, iv)
                      .then((skenc) => {
                        encryptWithPass(savedKeys.ekpriv, password, iv)
                          .then((ekenc) => {
                            if (skenc) encskpriv = skenc;
                            if (ekenc) encekpriv = ekenc;

                            const userData: UserRootData = {
                              keys: {
                                skpub: savedKeys.skpub,
                                skpriv: toBase64(encskpriv),
                                ekpub: savedKeys.ekpub,
                                ekpriv: toBase64(encekpriv),
                              },
                              iv: uint8ToBase64(iv),
                              pass: sha256(password),
                            };

                            const timestamp = new Date().getTime();
                            const userDataString = `${JSON.stringify(
                              userData
                            )}${savedKeys.skpub}${timestamp}`;

                            proofOfWork(userDataString, 3)
                              .then(({ hash, nonce }) => {
                                signData(
                                  hash,
                                  keys.signKeys.privateKey as CryptoKey
                                ).then((signature) => {
                                  const signupMessage: GraphEntryValue<UserRootData> =
                                    {
                                      key: userRoot,
                                      pub: savedKeys.skpub,
                                      nonce,
                                      timestamp,
                                      hash: hash,
                                      sig: toBase64(signature),
                                      value: userData,
                                    };

                                  this.gun
                                    .get(signupMessage.key)
                                    .put(
                                      { v: JSON.stringify(signupMessage) },
                                      (ack) => {
                                        if (ack.err) {
                                          reject(ack.err);
                                        } else {
                                          resolve(signupMessage.value);
                                        }
                                      }
                                    );
                                });
                              })
                              .catch(reject);
                          })
                          .catch(reject);
                      })
                      .catch(reject);
                  })

                  .catch(() => reject(new Error("")));
              } else {
                reject(new Error("Could not generate keys"));
              }
            })
            .catch(() => reject(new Error("Could not generate keys")));
        } else {
          reject(new Error("User already exists!"));
        }
      })
      .catch(() => {
        reject(new Error("Could not fetch user"));
      });
  });
}
