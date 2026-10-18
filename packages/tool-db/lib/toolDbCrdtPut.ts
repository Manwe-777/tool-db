import {
  ToolDb,
  CrdtPutMessage,
  textRandom,
  BaseCrdt,
  SignedChangeSet,
  createCrdtData,
  getChangeAuthor,
  getChangeSetHash,
  isCrdtData,
  mergeChangeSets,
} from ".";

/**
 * Triggers a PUT request to other peers.
 * Only the changes authored by us that were not published yet are signed and
 * sent as a new change set, along with the change sets we already know of.
 * Changes by other authors can only be published by them.
 * @param key key where we want to put the data at.
 * @param crdt The CRDT document, its changes must be authored with our address.
 * @param userNamespaced If this key bolongs to a user or its public. Making it private will enforce validation for our address and signatures.
 * @returns Promise<Data | null>
 */
export default async function toolDbCrdtPut<T = any>(
  this: ToolDb,
  key: string,
  crdt: BaseCrdt<T, any, any>,
  userNamespaced = false,
  to?: string[]
): Promise<CrdtPutMessage | null> {
  if (key.includes(".")) {
    // Dots are used as a delimitator character between bublic keys and the key of the user's data
    throw new Error(`Key cannot include dots!; ${key}`);
  }

  const address = this.userAccount.getAddress();
  if (!address) {
    throw new Error("You need to log in before you can PUT.");
  }

  const finalKey = userNamespaced ? `:${address}.${key}` : key;

  const data = await this.withKeyLock(finalKey, async () => {
    // The change sets we already have for this document
    let sets: SignedChangeSet[] = [];
    try {
      const stored = JSON.parse(await this.store.get(finalKey));
      if (isCrdtData(stored) && stored.c === crdt.type) {
        sets = stored.sets;
      }
    } catch (e) {
      // nothing stored yet
    }

    const published: Record<string, boolean> = {};
    sets
      .filter((set) => set.a === address)
      .forEach((set) => {
        set.c.forEach((change) => {
          published[JSON.stringify(change)] = true;
        });
      });

    const newChanges = crdt
      .getChanges()
      .filter(
        (change) =>
          getChangeAuthor(crdt.type, change) === address &&
          !published[JSON.stringify(change)]
      );

    if (newChanges.length > 0) {
      const set = { a: address, t: new Date().getTime(), c: newChanges };
      const hash = getChangeSetHash(finalKey, crdt.type, set);
      const signature = await this.userAccount.signData(hash);

      if (!signature || this.userAccount.getAddress() !== address) {
        throw new Error("Could not sign the data.");
      }

      this.verifiedChangeSets.add(hash);
      sets = mergeChangeSets(finalKey, crdt.type, sets, [
        { ...set, s: signature },
      ]).sets;
    }

    if (sets.length === 0) {
      return null;
    }

    const crdtData = createCrdtData(finalKey, crdt.type, sets);

    this.logger("PUT CRDT", key, crdtData);

    try {
      await this.store.put(finalKey, JSON.stringify(crdtData));
    } catch (e) {
      // do nothing
    }

    return crdtData;
  });

  if (!data) return null;

  const finalMessage: CrdtPutMessage = {
    type: "crdtPut",
    id: textRandom(10),
    to: to || [],
    data,
  };
  this.network.sendToAll(finalMessage);

  return finalMessage;
}
