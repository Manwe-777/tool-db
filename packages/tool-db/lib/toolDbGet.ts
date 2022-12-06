import { ToolDb, textRandom } from ".";

/**
 * Triggers a GET request to other peers. If the data is available locally it will return that instead.
 * @param key key of the data
 * @param userNamespaced If this key bolongs to a user or its public. Making it private will enforce validation for our address and signatures.
 * @param timeout Max time to wait for remote.
 * @returns Promise<Data>
 */
export default function toolDbGet<T = any>(
  this: ToolDb,
  key: string,
  userNamespaced = false,
  timeoutMs = 1000,
  to?: string[]
): Promise<T | null> {
  return new Promise((resolve, reject) => {
    if (userNamespaced && this.userAccount.getAddress() === undefined) {
      reject(new Error("You are not authorized yet!"));
      return;
    }
    const finalKey = userNamespaced
      ? `:${this.userAccount.getAddress()}.${key}`
      : key;
    this.logger("GET", finalKey);

    const msgId = textRandom(10);

    const cancelTimeout = setTimeout(() => {
      this.store
        .get(finalKey)
        .then((data) => {
          try {
            const message = JSON.parse(data);
            this.emit("data", message);
            resolve(message.v);
          } catch (e) {
            resolve(null);
          }
        })
        .catch((e) => {
          resolve(null);
        });
    }, timeoutMs);

    this.addIdListener(msgId, (msg) => {
      this.logger("GET RECV", finalKey);

      clearTimeout(cancelTimeout);
      if (msg.type === "put") {
        resolve(msg.data.v);
      }
    });

    this.store
      .get(finalKey)
      .then((data) => {
        try {
          const parsed = JSON.parse(data);
          const val = parsed.v;
          clearTimeout(cancelTimeout);
          this.removeIdListener(msgId);
          this.emit("data", parsed);
          resolve(val);
        } catch (e) {
          // do nothing
        }
      })
      .catch((e) => {
        // do nothing
      });

    // Do get
    this.network.sendToAll({
      type: "get",
      to: to || [],
      key: finalKey,
      id: msgId,
    });
  });
}
