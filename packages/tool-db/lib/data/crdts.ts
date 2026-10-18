import {
  ToolDb,
  ToolDbStorageAdapter,
  BaseCrdt,
  NostrEvent,
  NostrFilter,
  VerifyResult,
  CRDT_TYPES,
  getChangeAuthor,
  getTagValue,
  verifyEvent,
} from "..";

import {
  assertValidKey,
  getFinalKey,
  getKeyTag,
  getNamespaceOwner,
} from "./keys";
import { VerifyContext, isInFuture, runCustomVerificators } from "./verify";

/**
 * Kind of the events holding CRDT change sets. A regular event, relays keep
 * every one of them. Not registered in the NIPs yet, see NOSTR_FIRST.md.
 */
export const CRDT_EVENT_KIND = 1078;

/**
 * A CRDT document as stored: the change set events it is made of
 */
export interface NostrCrdtDocument {
  k: string;
  c: string;
  events: NostrEvent[];
}

/**
 * A CRDT document as given to listeners and events, with all the changes
 * of its change sets in `v`.
 */
export interface NostrCrdtView<C = any> extends NostrCrdtDocument {
  v: C[];
}

function isCrdtDocument(data: any): data is NostrCrdtDocument {
  return (
    typeof data === "object" &&
    data !== null &&
    typeof data.k === "string" &&
    CRDT_TYPES.includes(data.c) &&
    Array.isArray(data.events)
  );
}

export function getEventChanges<C = any>(event: NostrEvent): C[] {
  return JSON.parse(event.content);
}

export function toCrdtView<C = any>(doc: NostrCrdtDocument): NostrCrdtView<C> {
  return {
    ...doc,
    v: doc.events.reduce<C[]>(
      (changes, event) => changes.concat(getEventChanges<C>(event)),
      []
    ),
  };
}

export function getCrdtFilters(
  topic: string,
  finalKey: string,
  type?: string
): NostrFilter[] {
  const filter: NostrFilter = {
    kinds: [CRDT_EVENT_KIND],
    "#k": [getKeyTag(topic, finalKey)],
  };
  if (type) filter["#c"] = [type];
  const owner = getNamespaceOwner(finalKey);
  if (owner) filter.authors = [owner];
  return [filter];
}

export async function getStoredCrdt(
  store: ToolDbStorageAdapter,
  finalKey: string
): Promise<NostrCrdtDocument | undefined> {
  try {
    const stored = JSON.parse(await store.get(finalKey));
    return isCrdtDocument(stored) ? stored : undefined;
  } catch (e) {
    return undefined;
  }
}

/**
 * Verifies a change set event for a key: signature, kind, key, type,
 * timestamp, namespace, that every change is authored by the signer, and
 * custom verificators.
 */
export async function verifyCrdtEvent(
  ctx: VerifyContext,
  event: NostrEvent,
  finalKey: string,
  type: string
): Promise<VerifyResult> {
  if (!verifyEvent(event)) return VerifyResult.InvalidSignature;

  if (
    event.kind !== CRDT_EVENT_KIND ||
    getTagValue(event, "k") !== getKeyTag(ctx.topic, finalKey) ||
    getTagValue(event, "c") !== type ||
    !CRDT_TYPES.includes(type)
  ) {
    return VerifyResult.InvalidData;
  }

  if (isInFuture(event.created_at)) return VerifyResult.InvalidTimestamp;

  const owner = getNamespaceOwner(finalKey);
  if (owner && owner !== event.pubkey) return VerifyResult.AddressMismatch;

  let changes: any[];
  try {
    changes = getEventChanges(event);
  } catch (e) {
    return VerifyResult.InvalidData;
  }
  if (!Array.isArray(changes) || changes.length === 0) {
    return VerifyResult.InvalidData;
  }

  for (let i = 0; i < changes.length; i += 1) {
    const author = getChangeAuthor(type, changes[i]);
    if (author === undefined) return VerifyResult.InvalidData;
    // This is what makes authorship of every change provable
    if (author !== event.pubkey) return VerifyResult.AddressMismatch;
  }

  return runCustomVerificators(ctx, {
    k: finalKey,
    a: event.pubkey,
    t: event.created_at * 1000,
    h: event.id,
    s: event.sig,
    v: changes,
    c: type,
  });
}

/**
 * Verifies change set events, returning only the valid ones
 */
export async function filterValidCrdtEvents(
  ctx: VerifyContext,
  events: NostrEvent[],
  finalKey: string,
  type: string
): Promise<NostrEvent[]> {
  const results = await Promise.all(
    events.map((event) => verifyCrdtEvent(ctx, event, finalKey, type))
  );
  return events.filter(
    (_event, index) => results[index] === VerifyResult.Verified
  );
}

/**
 * Adds verified change set events to the stored document, and notifies
 * listeners if any was new.
 * @returns the stored document, and how many events were added
 */
export function storeCrdtEvents(
  tooldb: ToolDb,
  finalKey: string,
  type: string,
  events: NostrEvent[]
): Promise<{ doc: NostrCrdtDocument | undefined; added: number }> {
  return tooldb.withKeyLock(finalKey, async () => {
    const stored = await getStoredCrdt(tooldb.store, finalKey);
    // A key holds a single CRDT type
    if (stored && stored.c !== type) return { doc: stored, added: 0 };

    const doc: NostrCrdtDocument = stored
      ? { ...stored, events: [...stored.events] }
      : { k: finalKey, c: type, events: [] };
    const known = new Set(doc.events.map((event) => event.id));

    events.forEach((event) => {
      if (!known.has(event.id)) {
        known.add(event.id);
        doc.events.push(event);
      }
    });

    const added = doc.events.length - (stored?.events.length || 0);
    if (added === 0) return { doc: stored, added };

    try {
      await tooldb.store.put(finalKey, JSON.stringify(doc));
    } catch (e) {
      // do nothing
    }

    const view = toCrdtView(doc);
    tooldb.emit("data", view);
    // Key listeners of CRDT documents get a NostrCrdtView, with all changes in `v`
    tooldb.triggerKeyListener(finalKey, view as any);
    return { doc, added };
  });
}

/**
 * Handles a change set event received from a subscription
 */
export async function onCrdtEvent(
  tooldb: ToolDb,
  event: NostrEvent,
  finalKey: string
) {
  const type = getTagValue(event, "c") || "";
  const valid = await filterValidCrdtEvents(
    tooldb.verifyContext,
    [event],
    finalKey,
    type
  );
  if (valid.length > 0) await storeCrdtEvents(tooldb, finalKey, type, valid);
}

/**
 * Publishes the changes of a CRDT document authored by us that were not
 * published yet, as a new signed change set. Changes by other authors can
 * only be published by them. The CRDT must be created with our address as
 * its author.
 * @returns the change set event, or null if there was nothing new
 */
export async function putCrdt<T = any>(
  this: ToolDb,
  key: string,
  crdt: BaseCrdt<T, any, any>,
  userNamespaced = false
): Promise<NostrEvent | null> {
  assertValidKey(key);

  const address = this.userAccount.getAddress();
  if (!address) {
    throw new Error("You need to log in before you can PUT.");
  }

  const finalKey = getFinalKey(address, key, userNamespaced);

  const event = await this.withKeyLock(`publish:${finalKey}`, async () => {
    const stored = await getStoredCrdt(this.store, finalKey);
    const published = new Set<string>();
    stored?.events
      .filter((e) => e.pubkey === address)
      .forEach((e) =>
        getEventChanges(e).forEach((change) =>
          published.add(JSON.stringify(change))
        )
      );

    const newChanges = crdt
      .getChanges()
      .filter(
        (change) =>
          getChangeAuthor(crdt.type, change) === address &&
          !published.has(JSON.stringify(change))
      );
    if (newChanges.length === 0) return null;

    const signed = await this.userAccount.signEvent({
      kind: CRDT_EVENT_KIND,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ["k", getKeyTag(this.options.topic, finalKey)],
        ["c", crdt.type],
        ["t", this.options.topic],
      ],
      content: JSON.stringify(newChanges),
    });

    await storeCrdtEvents(this, finalKey, crdt.type, [signed]);
    return signed;
  });

  if (event) {
    this.logger("PUT CRDT", finalKey, event);
    this.relays
      .publish(event)
      .catch((e) => this.logger("Could not publish", e));
  }
  return event;
}

/**
 * Gets a CRDT document from our local data and the relays, and merges its
 * changes into the given CRDT.
 * @returns the document, or null if nobody wrote it
 */
export async function getCrdt<T = any>(
  this: ToolDb,
  key: string,
  crdt: BaseCrdt<T, any, any>,
  userNamespaced = false,
  timeoutMs = 1000
): Promise<NostrCrdtView | null> {
  const finalKey = getFinalKey(
    this.userAccount.getAddress() || "",
    key,
    userNamespaced
  );
  this.logger("CRDT GET", finalKey);

  const remote = this.isConnected
    ? await this.relays.query(
        getCrdtFilters(this.options.topic, finalKey, crdt.type),
        timeoutMs
      )
    : [];

  // Relays are not trusted, every change set is verified
  const valid = await filterValidCrdtEvents(
    this.verifyContext,
    remote,
    finalKey,
    crdt.type
  );
  const { doc } = await storeCrdtEvents(this, finalKey, crdt.type, valid);

  if (!doc || doc.c !== crdt.type) return null;

  const view = toCrdtView(doc);
  crdt.mergeChanges(view.v);
  return view;
}
