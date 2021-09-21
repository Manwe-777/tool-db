import toolDbClient from "./toolDbClient";
import { GraphEntryValue } from "./types/graph";

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
  this: toolDbClient,
  key: string,
  value: T,
  userNamespaced = false,
  pow = 0
): Promise<GraphEntryValue | null> {
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
    proofOfWork(dataString, pow)
      .then(({ hash, nonce }) => {
        if (this.user?.keys) {
          // Sign our value
          signData(hash, this.user.keys.signKeys.privateKey as CryptoKey)
            .then(async (signature) => {
              // Compose the message
              const data: GraphEntryValue = {
                key: userNamespaced ? `:${this.user?.pubKey}.${key}` : key,
                pub: this.user?.pubKey || "",
                nonce,
                timestamp,
                hash,
                sig: toBase64(signature),
                value,
              };

              if (this.debug) {
                console.log("PUT > " + key, data);
              }
              this.gun
                .get(data.key)
                .put({ v: JSON.stringify(data) }, (ack: any) => {
                  if (ack.err) {
                    reject(ack.err);
                  } else {
                    resolve(data.value);
                  }
                });
            })
            .catch(reject);
        }
      })
      .catch(reject);
  });
}
