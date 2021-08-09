import ToolChain from ".";
import { GraphEntryValue } from "./types/graph";
import { MessageGet } from "./types/message";
import sha256 from "./utils/sha256";

/**
 * Triggers a GET request to other peers. If the data is available locally it will return that instead.
 * @param key key of the data
 * @param onRemote Weter or not to trigger on additional remote responses if data was found locally before that.
 * @returns Promise<Data>
 */
export default function toolChainGet<T = any>(
  this: ToolChain,
  key: string,
  userNamespaced = false,
  timeoutMs = 10000,
  onRemote = false
): Promise<T> {
  let pubKey = "";
  return new Promise((resolve, reject) => {
    this.getPubKey()
      .then((p) => {
        pubKey = p;
      })
      .catch((e) => {
        if (userNamespaced) {
          reject(e);
        }
      })
      .finally(() => {
        const finalKey = userNamespaced ? `~${pubKey}.${key}` : key;

        const message: MessageGet = {
          hash: sha256(`${this.id}-${finalKey}`),
          source: this.id,
          type: "get",
          key: finalKey,
        };
        const triggerRemote = () => {
          const timeout = setTimeout(
            () => reject(new Error("Key not found (GET timed out)")),
            timeoutMs
          );
          this.listenForKey(key, (d: GraphEntryValue<T>["value"]) => {
            clearTimeout(timeout);
            resolve(d);
          });
          this.sendMessage(message);
        };

        this.dbRead<GraphEntryValue<T>>(finalKey)
          .then((localData) => {
            if (localData) {
              resolve(localData.value);
              if (onRemote) {
                triggerRemote();
              }
            } else {
              triggerRemote();
            }
          })
          .catch(triggerRemote);
      });
  });
}
