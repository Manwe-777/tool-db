import {
  textRandom,
  BaseCrdt,
  ToolDb,
  CrdtData,
  CrdtView,
  createCrdtData,
  flattenChangeSets,
  mergeChangeSets,
  isCrdtData,
  toCrdtView,
  verifyCrdtData,
} from ".";

/**
 * Triggers a GET request to other peers, and merges the changes of the
 * document into the given CRDT. Local changes are merged right away, but
 * unless we are offline we still wait for the reply of other peers (or the
 * timeout), since they may have changes we do not.
 * @param key key of the data
 * @param crdt CRDT to merge the changes into
 * @param userNamespaced If this key bolongs to a user or its public. Making it private will enforce validation for our address and signatures.
 * @param timeout Max time to wait for remote.
 * @returns Promise<CrdtView | null>
 */
export default function toolDbCrdtGet<T = any>(
  this: ToolDb,
  key: string,
  crdt: BaseCrdt<T, any, any>,
  userNamespaced = false,
  timeoutMs = 1000,
  to?: string[]
): Promise<CrdtView | null> {
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

    let localData: CrdtData | undefined;

    const isOurDocument = (data: any): data is CrdtData =>
      isCrdtData(data) && data.k === finalKey && data.c === crdt.type;

    // Our local data is trusted, it was verified before being stored
    const resolveLocal = (data: CrdtData) => {
      crdt.mergeChanges(flattenChangeSets(data.sets));
      const view = toCrdtView(data);
      this.emit("data", view);
      resolve(view);
    };

    const cancelTimeout = setTimeout(() => {
      this.store
        .get(finalKey)
        .then((data) => {
          try {
            const parsed = JSON.parse(data);
            if (isOurDocument(parsed)) {
              resolveLocal(parsed);
            } else {
              resolve(null);
            }
          } catch (e) {
            resolve(null);
          }
        })
        .catch((e) => resolve(null));
    }, timeoutMs);

    this.addIdListener(msgId, (msg) => {
      this.logger("GET RECV", finalKey);

      if (msg.type === "crdtPut" && isOurDocument(msg.data)) {
        const { data } = msg;
        // Replies are not trusted, only merge the change sets that verify.
        // If none do, we let the timeout fall back to our local data.
        verifyCrdtData(this, data).then((validSets) => {
          if (validSets.length > 0) {
            clearTimeout(cancelTimeout);
            crdt.mergeChanges(flattenChangeSets(validSets));
            const sets = localData
              ? mergeChangeSets(finalKey, crdt.type, localData.sets, validSets)
                  .sets
              : validSets;
            resolve(toCrdtView(createCrdtData(finalKey, crdt.type, sets)));
          }
        });
      }
    });

    this.store
      .get(finalKey)
      .then((data) => {
        try {
          const parsed = JSON.parse(data);
          if (isOurDocument(parsed)) {
            localData = parsed;
            crdt.mergeChanges(flattenChangeSets(parsed.sets));
            // Other peers may have changes we do not, so we still wait for
            // their reply unless we are offline.
            if (!this.isConnected) {
              clearTimeout(cancelTimeout);
              this.removeIdListener(msgId);
              resolveLocal(parsed);
            }
          }
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
