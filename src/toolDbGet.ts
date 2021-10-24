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

    this.store.get(key, (err, data) => {
      if (data) {
        try {
          const message = JSON.parse(data);
          this.triggerKeyListener(key, message);
        } catch (e) {
          // do nothing
        }
      }
    });

    const cancelTimeout = setTimeout(() => {
      this.store.get(key, (err, data) => {
        if (data) {
          try {
            const message = JSON.parse(data);
            resolve(message.v);
          } catch (e) {
            resolve(null);
          }
        } else {
          resolve(null);
        }
      });
    }, timeoutMs);

    this.addIdListener(msgId, (msg) => {
      if (this.options.debug) {
        console.log("GET RECV  > " + finalKey, msg);
      }

      clearTimeout(cancelTimeout);
      if (msg.type === "put") {
        resolve(msg.v);
      }
    });

    // Do get
    this.websockets.send({
      type: "get",
      to: this.websockets.activePeers,
      key: finalKey,
      id: msgId,
    });
  });
}
