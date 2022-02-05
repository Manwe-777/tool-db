import ToolDb from "./tooldb";

import {
  PutMessage,
  textRandom,
  UserRootData,
  VerificationData,
  arrayBufferToHex,
  encryptWithPass,
  exportKeyAsHex,
  generateKeysComb,
  saveKeysComb,
  generateIv,
  proofOfWork,
  sha256,
  signData,
} from ".";

import uint8ArrayToHex from "./utils/encoding/uint8ArrayToHex";

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
                exportKeyAsHex(keys.signKeys.publicKey as CryptoKey)
                  .then((publicHexed) => {
                    saveKeysComb(keys.signKeys, keys.encryptionKeys)
                      .then((savedKeys) => {
                        const iv = generateIv();
                        // Encrypt sign key
                        encryptWithPass(savedKeys?.skpriv || "", password, iv)
                          .then((skEncrypted) => {
                            encryptWithPass(
                              savedKeys?.ekpriv || "",
                              password,
                              iv
                            )
                              .then((ekEncrypted) => {
                                const userData: UserRootData = {
                                  keys: {
                                    skpriv: skEncrypted
                                      ? arrayBufferToHex(skEncrypted)
                                      : "",
                                    ekpriv: ekEncrypted
                                      ? arrayBufferToHex(ekEncrypted)
                                      : "",
                                    skpub: savedKeys?.skpub || "",
                                    ekpub: savedKeys?.ekpub || "",
                                  },
                                  iv: uint8ArrayToHex(iv),
                                  pass: sha256(password),
                                };

                                const timestamp = new Date().getTime();
                                const userDataString = `${JSON.stringify(
                                  userData
                                )}${publicHexed}${timestamp}`;

                                proofOfWork(userDataString, 0)
                                  .then(({ hash, nonce }) => {
                                    signData(
                                      hash,
                                      keys.signKeys.privateKey as CryptoKey
                                    ).then((signature) => {
                                      const signupMessage: VerificationData<UserRootData> =
                                        {
                                          k: userRoot,
                                          a: publicHexed,
                                          n: nonce,
                                          t: timestamp,
                                          h: hash,
                                          s: arrayBufferToHex(signature),
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
