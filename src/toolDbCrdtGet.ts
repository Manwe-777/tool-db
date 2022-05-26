import { textRandom } from ".";
import BaseCrdt from "./crdt/baseCrdt";
import ToolDb from "./tooldb";
import { CrdtPutMessage } from "./types/message";

/**
 * Triggers a GET request to other peers. If the data is available locally it will return that instead.
 * @param key key of the data
 * @param userNamespaced If this key bolongs to a user or its public. Making it private will enforce validation for our address and signatures.
 * @param timeout Max time to wait for remote.
 * @returns Promise<Data>
 */
export default function toolDbCrdtGet<T = any>(
  this: ToolDb,
  key: string,
  crdt: BaseCrdt<T, any, any>,
  userNamespaced = false,
  timeoutMs = 1000
): Promise<CrdtPutMessage<T> | null> {
  return new Promise((resolve, reject) => {
    if (userNamespaced && this.getAddress() === undefined) {
      reject(new Error("You are not authorized yet!"));
      return;
    }
    const finalKey = userNamespaced ? `:${this.getAddress()}.${key}` : key;
    if (this.options.debug) {
      console.log("CRDT GET > " + finalKey);
    }

    const msgId = textRandom(10);

    const cancelTimeout = setTimeout(() => {
      this.store.get(finalKey, (err, data) => {
        if (data) {
          try {
            const message = JSON.parse(data);
            crdt.mergeChanges(message.v);
            resolve(message);
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
      if (msg.type === "crdtPut") {
        crdt.mergeChanges(msg.data.v);
        resolve(msg);
      }
    });

    this.store.get(finalKey, (err, data) => {
      if (data) {
        try {
          const msg = JSON.parse(data);
          clearTimeout(cancelTimeout);
          this.removeIdListener(msgId);
          crdt.mergeChanges(msg.v);
          resolve(msg);
        } catch (e) {
          // do nothing
        }
      }
    });

    // Do get
    this.network.sendToAll({
      type: "crdtGet",
      to: [],
      key: finalKey,
      id: msgId,
    });
  });
}
