import ToolDb from "./tooldb";

import { EncryptedKeystoreV3Json } from "web3-core";

import {
  PutMessage,
  textRandom,
  VerificationData,
  proofOfWork,
  sha256,
} from ".";

export default async function toolDbSignUp(
  this: ToolDb,
  user: string,
  password: string
): Promise<PutMessage<any>> {
  const userRoot = `==${user}`;
  return new Promise((resolve, reject) => {
    this.getData(userRoot, false, 3000)
      .then((data) => {
        if (data === null) {
          const account = new this.options.userAdapter(this);
          const userData = account.encryptAccount(sha256(password));

          const timestamp = new Date().getTime();
          const userDataString = `${JSON.stringify(
            userData
          )}${account.getAddress()}${timestamp}`;

          proofOfWork(userDataString, 0)
            .then(({ hash, nonce }) => {
              const signature = account.signData(hash);

              const signupMessage: VerificationData = {
                k: userRoot,
                a: account.getAddress() || "",
                n: nonce,
                t: timestamp,
                h: hash,
                s: signature,
                v: userData,
                c: null,
              };

              this.store.put(
                userRoot,
                JSON.stringify(signupMessage),
                (err, data) => {
                  //
                }
              );

              if (this.options.debug) {
                console.log("SIGNUP PUT > " + userRoot, signupMessage);
              }

              const finalMsg = {
                type: "put",
                id: textRandom(10),
                to: [],
                data: signupMessage,
              } as PutMessage;

              this.network.sendToAll(finalMsg);
              resolve(finalMsg);
            })
            .catch(reject);
        } else {
          reject(new Error("User already exists!"));
        }
      })
      .catch(() => {
        reject(new Error("Could not fetch user"));
      });
  });
}
