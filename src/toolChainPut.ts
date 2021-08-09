import ToolChain from ".";

import { MessagePut } from "./types/message";
import proofOfWork from "./utils/proofOfWork";

import signData from "./utils/signData";
import toBase64 from "./utils/toBase64";

export default function toolChainPut<T = any>(
  this: ToolChain,
  key: string,
  value: T,
  userNamespaced = false
): Promise<MessagePut | null> {
  return new Promise((resolve, reject) => {
    if (key.includes(".")) {
      // Dots are used as a delimitator character between bublic keys and the key of the user's data
      reject(new Error("Key cannot include dots!"));
      return;
    }

    if (!this.user) {
      reject(new Error("You need to log in before you can PUT."));
      return;
    }

    // Get current public key
    this.getPubKey()
      .then((pubKey) => {
        const timestamp = new Date().getTime();
        const dataString = `${JSON.stringify(value)}${pubKey}${timestamp}`;
        // WORK
        proofOfWork(dataString, 3)
          .then(({ hash, nonce }) => {
            if (this.user?.keys) {
              // Sign our value
              signData(hash, this.user.keys.signKeys.privateKey)
                .then(async (signature) => {
                  // Compose the message
                  const message: MessagePut = {
                    type: "put",
                    hash,
                    val: {
                      key: userNamespaced ? `~${pubKey}.${key}` : key,
                      pub: pubKey,
                      nonce,
                      timestamp,
                      hash,
                      sig: toBase64(signature),
                      value,
                    },
                  };
                  // Ship it
                  this.sendMessage(message);
                  resolve(message);
                })
                .catch(reject);
            }
          })
          .catch(reject);
      })
      .catch(reject);
  });
}
