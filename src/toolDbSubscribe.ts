import { textRandom } from ".";
import ToolDb from "./tooldb";

/**
 * Subscribe to all PUT updates for this key.
 * @param key key of the data
 * @param userNamespaced If this key bolongs to a user or its public. Making it
 * private will enforce validation for our address and signatures.
 * @returns Promise<Data>
 */
export default function toolDbSubscribe(
  this: ToolDb,
  key: string,
  userNamespaced = false
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (userNamespaced && this.userAccount.getAddress() === undefined) {
      reject(new Error("You are not authorized yet!"));
      return;
    }

    const finalKey = userNamespaced
      ? `:${this.userAccount.getAddress()}.${key}`
      : key;

    this.logger("SUBSCRIBE", finalKey);

    const msgId = textRandom(10);

    this.network.sendToAll({
      type: "subscribe",
      key: finalKey,
      to: [],
      id: msgId,
    });

    this.store
      .get(finalKey)
      .then((data) => {
        try {
          const message = JSON.parse(data);
          this.triggerKeyListener(finalKey, message);
        } catch (e) {
          // do nothing
        }
      })
      .catch((e) => {
        // do nothing
      })
      .finally(() => {
        resolve();
      });
  });
}
