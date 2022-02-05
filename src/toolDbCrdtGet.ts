import { textRandom } from ".";
import ToolDb from "./tooldb";
import hexToUint8 from "./utils/encoding/hexToUint8";

/**
 * Triggers a GET request to other peers. If the data is available locally it will return that instead.
 * @param key key of the data
 * @param userNamespaced If this key bolongs to a user or its public. Making it private will enforce validation for our public key and signatures.
 * @param timeout Max time to wait for remote.
 * @returns Promise<Data>
 */
export default function toolDbCrdtGet(
  this: ToolDb,
  key: string,
  userNamespaced = false,
  timeoutMs = 1000
): Promise<Uint8Array | null> {
  return new Promise((resolve, reject) => {
    if (userNamespaced && this.user?.adress === undefined) {
      reject(new Error("You are not authorized yet!"));
      return;
    }
    const finalKey = userNamespaced ? `:${this.user?.adress}.${key}` : key;
    if (this.options.debug) {
      console.log("CRDT GET > " + finalKey);
    }

    const msgId = textRandom(10);

    const cancelTimeout = setTimeout(() => {
      this.loadCrdtDocument(finalKey).then((data: any) => {
        if (this.options.debug) {
          console.log("CRDT DATA > ", data);
        }
        if (data) {
          try {
            this.removeIdListener(msgId);
            const document = hexToUint8(data);
            resolve(document);
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
        console.log("CRDT GET RECV  > " + finalKey, msg);
      }

      clearTimeout(cancelTimeout);
      if (msg.type === "crdt") {
        const document = hexToUint8(msg.doc);
        resolve(document);
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
