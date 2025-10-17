import { textRandom, BaseCrdt, ToolDb, CrdtPutMessage } from ".";

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
  timeoutMs = 1000,
  to?: string[]
): Promise<CrdtPutMessage<T> | null> {
  return new Promise((resolve, reject) => {
    if (userNamespaced && this.userAccount.getAddress() === undefined) {
      reject(new Error("You are not authorized yet!"));
      return;
    }
    const finalKey = userNamespaced
      ? `:${this.userAccount.getAddress()}.${key}`
      : key;
    this.logger("CRDT GET", finalKey);

    const msgId = textRandom(10);

    const cancelTimeout = setTimeout(() => {
      this.store
        .get(finalKey)
        .then((data) => {
          try {
            const message = JSON.parse(data);
            crdt.mergeChanges(message.v);

            this.emit("data", message);
            resolve(message);
          } catch (e) {
            resolve(null);
          }
        })
        .catch((e) => resolve(null));
    }, timeoutMs);

    this.addIdListener(msgId, (msg) => {
      this.logger("GET RECV", finalKey);

      clearTimeout(cancelTimeout);
      if (msg.type === "crdtPut") {
        crdt.mergeChanges(msg.data.v);
        resolve(msg);
      }
    });

    this.store
      .get(finalKey)
      .then((data) => {
        try {
          const msg = JSON.parse(data);
          clearTimeout(cancelTimeout);
          this.removeIdListener(msgId);
          crdt.mergeChanges(msg.v);
          this.emit("data", msg);
          resolve(msg);
        } catch (e) {
          // do nothing
        }
      })
      .catch(() => {
        // do nothing
      });

    // Do get
    this.network.sendToAll({
      type: "crdtGet",
      to: to || [],
      key: finalKey,
      id: msgId,
    });
  });
}
