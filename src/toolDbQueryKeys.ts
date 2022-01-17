import _ from "lodash";
import { textRandom } from ".";
import ToolDb from "./tooldb";

/**
 * Triggers a QUERY request to other peers.
 * @param key start of the key
 * @param userNamespaced If this key bolongs to a user or its public.
 * @returns Promise<Data>
 */
export default function toolDbQueryKeys(
  this: ToolDb,
  key: string,
  userNamespaced = false,
  timeoutMs = 1000
): Promise<string[] | null> {
  return new Promise((resolve, reject) => {
    if (userNamespaced && this.user?.pubKey === undefined) {
      reject(new Error("You are not authorized yet!"));
      return;
    }
    const finalKey = userNamespaced ? `:${this.user?.pubKey}.${key}` : key;
    if (this.options.debug) {
      console.log("QUERY > " + finalKey);
    }

    const msgId = textRandom(10);
    let foundKeys: string[] = [];
    let timeout: NodeJS.Timeout | undefined;

    this.store.query(finalKey).then((localKeys) => {
      foundKeys = [...foundKeys, ...localKeys];
      timeout = setTimeout(finishListening, timeoutMs);
    });

    const finishListening = () => {
      resolve(_.uniq(foundKeys));
    };

    this.addIdListener(msgId, (msg) => {
      if (this.options.debug) {
        console.log("QUERY RECV  > " + finalKey, msg);
      }
      if (msg.type === "queryAck") {
        foundKeys = [...foundKeys, ...msg.keys];

        if (timeout) {
          clearTimeout(timeout);
        }
        timeout = setTimeout(finishListening, timeoutMs);
      }
    });

    // Do get
    this.network.sendToAll({
      type: "query",
      to: [],
      key: finalKey,
      id: msgId,
    });
  });
}
