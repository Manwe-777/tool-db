import axios from "axios";
import toolDbClient from "./toolDbClient";
import { GraphEntryValue } from "./types/graph";

import proofOfWork from "./utils/proofOfWork";

import signData from "./utils/signData";
import toBase64 from "./utils/toBase64";

export default function toolDbPut<T = any>(
  this: toolDbClient,
  key: string,
  value: T,
  userNamespaced = false
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
    proofOfWork(dataString, 3)
      .then(({ hash, nonce }) => {
        if (this.user?.keys) {
          // Sign our value
          signData(hash, this.user.keys.signKeys.privateKey)
            .then(async (signature) => {
              // Compose the message
              const data: GraphEntryValue = {
                key: userNamespaced ? `~${this.user?.pubKey}.${key}` : key,
                pub: this.user?.pubKey || "",
                nonce,
                timestamp,
                hash,
                sig: toBase64(signature),
                value,
              };

              axios
                .post(`${this.host}/api/put`, data)
                .then((value) => {
                  resolve(value.data);
                })
                .catch(reject);
            })
            .catch(reject);
        }
      })
      .catch(reject);
  });
}
