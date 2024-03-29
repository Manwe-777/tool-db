import {
  ToolDb,
  PutMessage,
  textRandom,
  VerificationData,
  proofOfWork,
} from ".";

/**
 * Triggers a PUT request to other peers.
 * @param key key where we want to put the data at.
 * @param value Data we want to any (any type)
 * @param userNamespaced If this key bolongs to a user or its public. Making it private will enforce validation for our address and signatures.
 * @returns Promise<Data | null>
 */
export default function toolDbPut<T = any>(
  this: ToolDb,
  key: string,
  value: T,
  userNamespaced = false,
  to?: string[]
): Promise<PutMessage<T> | null> {
  return new Promise((resolve, reject) => {
    if (key.includes(".")) {
      // Dots are used as a delimitator character between bublic keys and the key of the user's data
      reject(new Error(`Key cannot include dots!; ${key}`));
      return;
    }

    if (!this.userAccount || !this.userAccount.getAddress()) {
      reject(new Error("You need to log in before you can PUT."));
      return;
    }

    const timestamp = new Date().getTime();
    const dataString = `${JSON.stringify(
      value
    )}${this.userAccount.getAddress()}${timestamp}`;

    // WORK
    proofOfWork(dataString, this.options.pow)
      .then(({ hash, nonce }) => {
        this.userAccount.signData(hash).then((signature) => {
          if (signature && this.userAccount.getAddress()) {
            const finalKey = userNamespaced
              ? `:${this.userAccount.getAddress()}.${key}`
              : key;

            // Compose the message
            const data: VerificationData = {
              k: finalKey,
              a: this.userAccount.getAddress() || "",
              n: nonce,
              t: timestamp,
              h: hash,
              s: signature,
              v: value,
              c: null,
            };

            this.logger("PUT", key, data);

            const finalMessage: PutMessage = {
              type: "put",
              id: textRandom(10),
              to: to || [],
              data,
            };

            this.network.sendToAll(finalMessage);
            this.store
              .put(finalKey, JSON.stringify(data))
              .catch((e) => {
                // do nothing
              })
              .finally(() => {
                resolve(finalMessage);
              });
          }
        });
      })
      .catch(reject);
  });
}
