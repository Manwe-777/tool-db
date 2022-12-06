import { ToolDb, textRandom, uniq } from ".";

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
  timeoutMs = 1000,
  to?: string[]
): Promise<string[] | null> {
  const user = this.userAccount;

  return new Promise((resolve, reject) => {
    if (userNamespaced && user.getAddress() === undefined) {
      reject(new Error("You are not authorized yet!"));
      return;
    }
    const finalKey = userNamespaced ? `:${user.getAddress()}.${key}` : key;
    this.logger("QUERY", finalKey);

    const msgId = textRandom(10);
    let foundKeys: string[] = [];
    let timeout: NodeJS.Timeout | undefined;

    this.store
      .query(finalKey)
      .then((localKeys) => {
        foundKeys = [...foundKeys, ...localKeys];
        timeout = setTimeout(finishListening, timeoutMs);
      })
      .catch((e) => {
        // do nothing
      });

    const finishListening = () => {
      resolve(uniq(foundKeys));
    };

    this.addIdListener(msgId, (msg) => {
      this.logger("QUERY RECV", finalKey);

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
      to: to || [],
      key: finalKey,
      id: msgId,
    });
  });
}
