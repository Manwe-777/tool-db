import {
  ToolDb,
  CrdtPutMessage,
  SignedChangeSet,
  createCrdtData,
  isCrdtData,
  mergeChangeSets,
  toCrdtView,
  verifyCrdtData,
} from "..";

export default async function handleCrdtPut(
  this: ToolDb,
  message: CrdtPutMessage,
  remotePeerId: string
) {
  if (!isCrdtData(message.data)) {
    // Also drops legacy (unsigned) CRDT documents
    this.logger("Invalid CRDT data: ", message);
    return;
  }

  const key = message.data.k;
  const type = message.data.c;

  // Only keep the change sets that verify, so a single forged set does not
  // block the valid ones
  const validSets = await verifyCrdtData(this, message.data);
  if (validSets.length === 0) {
    this.logger("unverified message: ", message);
    return;
  }

  const data = await this.withKeyLock(key, async () => {
    let storedSets: SignedChangeSet[] = [];
    try {
      const stored = JSON.parse(await this.store.get(key));
      if (isCrdtData(stored) && stored.c === type) {
        storedSets = stored.sets;
      }
    } catch (e) {
      // nothing stored yet
    }

    const merged = mergeChangeSets(key, type, storedSets, validSets);
    if (merged.added === 0) {
      return null;
    }

    const mergedData = createCrdtData(key, type, merged.sets);
    try {
      await this.store.put(key, JSON.stringify(mergedData));
    } catch (e) {
      this.logger("Couldnt insert crdt data", e);
    }
    return mergedData;
  });

  // Nothing new
  if (!data) return;

  const finalMessage: CrdtPutMessage = {
    ...message,
    to: [...message.to, remotePeerId],
    data,
  };

  this.emit("crdtput", finalMessage);
  this.emit("data", toCrdtView(data));
  this.emit("verified", finalMessage);

  // relay to other servers !!!
  this.network.sendToAll(finalMessage, true);

  // Key listeners of CRDT documents get a CrdtView, with all changes in `v`
  this.triggerKeyListener(key, toCrdtView(data) as any);
}
