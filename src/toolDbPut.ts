import { PutMessage, textRandom, uint8ToBase64, VerificationData } from ".";
import ToolDb from "./tooldb";

import proofOfWork from "./utils/proofOfWork";

import signData from "./utils/signData";
import toBase64 from "./utils/toBase64";

/**
 * Triggers a PUT request to other peers.
 * @param key key where we want to put the data at.
 * @param value Data we want to any (any type)
 * @param userNamespaced If this key bolongs to a user or its public. Making it private will enforce validation for our public key and signatures.
 * @returns Promise<Data | null>
 */
export default function toolDbPut<T = any>(
  this: ToolDb,
  key: string,
  value: T,
  userNamespaced = false
): Promise<PutMessage<T> | null> {
  return new Promise((resolve, reject) => {
    if (key.includes(".")) {
      // Dots are used as a delimitator character between bublic keys and the key of the user's data
      reject(new Error(`Key cannot include dots!; ${key}`));
      return;
    }

    if (!this.user) {
      reject(new Error("You need to log in before you can PUT."));
      return;
    }

    const timestamp = new Date().getTime();
    const dataString = `${JSON.stringify(value)}${
      this.user.pubKey
    }${timestamp}`;

    // WORK
    proofOfWork(dataString, this.options.pow)
      .then(({ hash, nonce }) => {
        if (this.user?.keys) {
          // Sign our value
          signData(hash, this.user.keys.signKeys.privateKey as CryptoKey)
            .then(async (signature) => {
              // Compose the message
              const data: VerificationData = {
                k: userNamespaced ? `:${this.user?.pubKey}.${key}` : key,
                p: this.user?.pubKey || "",
                n: nonce,
                t: timestamp,
                h: hash,
                s: toBase64(signature),
                v: value,
              };

              if (this.options.debug) {
                console.log("PUT > " + key, data);
              }

              this.websockets.send({
                type: "put",
                id: textRandom(10),
                ...data,
              } as PutMessage);
            })
            .catch(reject);
        }
      })
      .catch(reject);
  });
}
