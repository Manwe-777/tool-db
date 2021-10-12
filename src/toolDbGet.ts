import { textRandom } from ".";
import ToolDb from "./tooldb";

/**
 * Triggers a GET request to other peers. If the data is available locally it will return that instead.
 * @param key key of the data
 * @param userNamespaced If this key bolongs to a user or its public. Making it private will enforce validation for our public key and signatures.
 * @param timeout Max time to wait for remote.
 * @returns Promise<Data>
 */
export default function toolDbGet<T = any>(
  this: ToolDb,
  key: string,
  userNamespaced = false,
  timeoutMs = 1000
): Promise<T | null> {
  return new Promise((resolve, reject) => {
    if (userNamespaced && this.user?.pubKey === undefined) {
      reject(new Error("You are not authorized yet!"));
      return;
    }
    const finalKey = userNamespaced ? `:${this.user?.pubKey}.${key}` : key;
    if (this.options.debug) {
      console.log("GET > " + finalKey);
    }

    const msgId = textRandom(10);

    const tryGetLocally = () => {
      this.store.get(key, (err, data) => {
        if (err !== null && err !== undefined) {
          resolve(data);
        } else {
          resolve(null);
        }
      });
    };

    const cancelTimeout = setTimeout(tryGetLocally, timeoutMs);

    this.addIdListener(msgId, (msg) => {
      if (this.options.debug) {
        console.log("GET RECV  > " + finalKey, msg);
      }

      clearTimeout(cancelTimeout);
      if (msg.type === "put") {
        resolve(msg.val);
      } else {
        tryGetLocally();
      }
    });

    // Do get
    this.websockets.send({
      type: "get",
      to: this.websockets.activePeers,
      key: key,
      id: msgId,
    });
  });
}
