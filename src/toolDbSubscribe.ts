import { textRandom } from ".";
import ToolDb from "./tooldb";

/**
 * Subscribe to all PUT updates for this key.
 * @param key key of the data
 * @param userNamespaced If this key bolongs to a user or its public. Making it private will enforce validation for our public key and signatures.
 * @returns Promise<Data>
 */
export default function toolDbSubscribe(
  this: ToolDb,
  key: string,
  userNamespaced = false
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (userNamespaced && this.user?.pubKey === undefined) {
      reject(new Error("You are not authorized yet!"));
      return;
    }
    const finalKey = userNamespaced ? `:${this.user?.pubKey}.${key}` : key;
    if (this.options.debug) {
      console.log("Subscribe > " + finalKey);
    }

    const msgId = textRandom(10);

    this.websockets.send({
      type: "subscribe",
      key: finalKey,
      id: msgId,
    });
    resolve();
  });
}
