import { BinaryChange } from "automerge";
import { CrdtPutMessage, textRandom, VerificationData } from ".";
import ToolDb from "./tooldb";

import proofOfWork from "./utils/proofOfWork";

import signData from "./utils/signData";
import arrayBufferToHex from "./utils/encoding/arrayBufferToHex";
import uint8ArrayToHex from "./utils/encoding/uint8ArrayToHex";

/**
 * Triggers a PUT request to other peers.
 * @param key key where we want to put the data at.
 * @param value Data we want to any (any type)
 * @param userNamespaced If this key bolongs to a user or its public. Making it private will enforce validation for our public key and signatures.
 * @returns Promise<Data | null>
 */
export default function toolDbCrdtPut<T = any>(
  this: ToolDb,
  key: string,
  value: BinaryChange[],
  userNamespaced = false
): Promise<CrdtPutMessage | null> {
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

    const encodedData = JSON.stringify(value.map(uint8ArrayToHex));

    const dataString = `${encodedData}${this.user.adress}${timestamp}`;

    // WORK
    proofOfWork(dataString, this.options.pow)
      .then(({ hash, nonce }) => {
        if (this.user?.keys) {
          // Sign our value
          signData(hash, this.user.keys.signKeys.privateKey as CryptoKey)
            .then(async (signature) => {
              // Compose the message
              const data: VerificationData = {
                k: userNamespaced ? `:${this.user?.adress}.${key}` : key,
                a: this.user?.adress || "",
                n: nonce,
                t: timestamp,
                h: hash,
                s: arrayBufferToHex(signature),
                v: encodedData,
              };

              if (this.options.debug) {
                console.log("PUT CRDT > " + key, data);
              }

              const finalMessage: CrdtPutMessage = {
                type: "crdtPut",
                id: textRandom(10),
                to: [],
                ...data,
              };
              this.network.sendToAll(finalMessage);
              resolve(finalMessage);
            })
            .catch(reject);
        }
      })
      .catch(reject);
  });
}
