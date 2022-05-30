import { CrdtPutMessage, textRandom, VerificationData } from ".";
import ToolDb from "./tooldb";

import proofOfWork from "./utils/proofOfWork";

import { MapChanges } from "./crdt/mapCrdt";
import BaseCrdt from "./crdt/baseCrdt";

/**
 * Triggers a PUT request to other peers.
 * @param key key where we want to put the data at.
 * @param value Data we want to any (any type)
 * @param userNamespaced If this key bolongs to a user or its public. Making it private will enforce validation for our address and signatures.
 * @returns Promise<Data | null>
 */
export default function toolDbCrdtPut<T = any>(
  this: ToolDb,
  key: string,
  crdt: BaseCrdt<T, any, any>,
  userNamespaced = false
): Promise<CrdtPutMessage | null> {
  return new Promise((resolve, reject) => {
    if (key.includes(".")) {
      // Dots are used as a delimitator character between bublic keys and the key of the user's data
      reject(new Error(`Key cannot include dots!; ${key}`));
      return;
    }

    if (!this.getAddress()) {
      reject(new Error("You need to log in before you can PUT."));
      return;
    }

    const timestamp = new Date().getTime();

    const crdtChanges = crdt.getChanges();

    const encodedData = JSON.stringify(crdtChanges);

    const dataString = `${encodedData}${this.getAddress()}${timestamp}`;

    // WORK
    proofOfWork(dataString, this.options.pow)
      .then(({ hash, nonce }) => {
        const signature = this.signData(hash);
        if (signature && this.getAddress()) {
          // Compose the message
          const data: VerificationData<any> = {
            k: userNamespaced ? `:${this.getAddress()}.${key}` : key,
            a: this.getAddress() || "",
            n: nonce,
            t: timestamp,
            h: hash,
            s: signature.signature,
            v: crdtChanges,
            c: crdt.type,
          };

          if (this.options.debug) {
            console.log("PUT CRDT > " + key, data);
          }

          const finalMessage: CrdtPutMessage<any> = {
            type: "crdtPut",
            id: textRandom(10),
            to: [],
            data,
          };
          this.network.sendToAll(finalMessage);
          resolve(finalMessage);
        }
      })
      .catch(reject);
  });
}
