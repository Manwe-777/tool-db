import { CrdtMessage, textRandom, uint8ToBase64 } from ".";
import ToolDb from "./tooldb";
import Automerge from "automerge";

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

    this.store.get(finalKey, (err, data) => {
      if (data) {
        try {
          const message = JSON.parse(data);
          this.triggerKeyListener(finalKey, message);
        } catch (e) {
          // do nothing
        }
      }
    });

    // console.log("do subscribe", finalKey);
    this.loadCrdtDocument(finalKey, false).then((doc) => {
      if (doc) {
        const savedDoc = Automerge.save(doc);
        const msg: CrdtMessage = {
          type: "crdt",
          key: finalKey,
          id: textRandom(10),
          to: [],
          doc: uint8ToBase64(savedDoc),
        };
        this.triggerKeyListener(finalKey, msg);
      }
    });

    this.network.sendToAll({
      type: "subscribe",
      key: finalKey,
      to: [],
      id: msgId,
    });

    resolve();
  });
}
