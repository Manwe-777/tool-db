import ToolDb from "./tooldb";

import {
  PutMessage,
  textRandom,
  UserRootData,
  VerificationData,
  arrayBufferToHex,
  encryptWithPass,
  generateIv,
  proofOfWork,
  sha256,
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
          const account = this.web3.eth.accounts.create();
          const iv = generateIv();
          encryptWithPass(account.privateKey, password, iv).then(
            (encryptedPrivateKey) => {
              if (encryptedPrivateKey) {
                const userData: UserRootData = {
                  privateKey: arrayBufferToHex(encryptedPrivateKey),
                  iv: uint8ArrayToHex(iv),
                  pass: sha256(password),
                };

                const timestamp = new Date().getTime();
                const userDataString = `${JSON.stringify(userData)}${
                  account.address
                }${timestamp}`;

                proofOfWork(userDataString, 0)
                  .then(({ hash, nonce }) => {
                    const signature = this.web3.eth.accounts.sign(
                      hash,
                      account.privateKey
                    );

                    const signupMessage: VerificationData<UserRootData> = {
                      k: userRoot,
                      a: account.address,
                      n: nonce,
                      t: timestamp,
                      h: hash,
                      s: signature.signature,
                      v: userData,
                    };

                    if (this.options.debug) {
                      console.log("SIGNUP PUT > " + userRoot, signupMessage);
                    }

                    const finalMsg = {
                      type: "put",
                      id: textRandom(10),
                      to: [],
                      ...signupMessage,
                    } as PutMessage;

                    this.network.sendToAll(finalMsg);
                    resolve(finalMsg);
                  })
                  .catch(reject);
              }
            }
          );
        } else {
          reject(new Error("User already exists!"));
        }
      })
      .catch(() => {
        reject(new Error("Could not fetch user"));
      });
  });
}
