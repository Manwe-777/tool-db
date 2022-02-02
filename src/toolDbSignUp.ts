import {
  arrayBufferToBase64,
  PutMessage,
  textRandom,
  UserRootData,
  VerificationData,
} from ".";

import ToolDb from "./tooldb";

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
  this: ToolDb,
  user: string,
  password: string
): Promise<PutMessage<any>> {
  const userRoot = `==${user}`;
  return new Promise((resolve, reject) => {
    this.getData<UserRootData>(userRoot, false, 3000)
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

                            proofOfWork(userDataString, 0)
                              .then(({ hash, nonce }) => {
                                signData(
                                  hash,
                                  keys.signKeys.privateKey as CryptoKey
                                ).then((signature) => {
                                  const signupMessage: VerificationData<UserRootData> =
                                    {
                                      k: userRoot,
                                      p: savedKeys.skpub,
                                      n: nonce,
                                      t: timestamp,
                                      h: hash,
                                      s: arrayBufferToBase64(signature),
                                      v: userData,
                                    };

                                  if (this.options.debug) {
                                    console.log(
                                      "SIGNUP PUT > " + userRoot,
                                      signupMessage
                                    );
                                  }

                                  const finalMsg = {
                                    type: "put",
                                    id: textRandom(10),
                                    to: [],
                                    ...signupMessage,
                                  } as PutMessage;

                                  this.network.sendToAll(finalMsg);
                                  resolve(finalMsg);
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
