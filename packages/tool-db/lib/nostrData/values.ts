import {
  ToolDb,
  NostrEvent,
  NostrFilter,
  VerificationData,
  VerifyResult,
  getTagValue,
  isNewerEvent,
  verifyEvent,
} from "..";

import { runCustomVerificators } from "../toolDbVerificationWrapper";

/**
 * Application data (NIP-78), an addressable event: relays keep the latest
 * event per author and key.
 */
export const VALUE_KIND = 30078;

// Max clock shift allowed, same as regular messages
const MAX_CLOCK_SHIFT_SECONDS = 30;

/**
 * The network adapter, when it is the Nostr one
 */
export interface NostrNetwork {
  isNostrNetwork: true;
  publish(event: NostrEvent, timeoutMs?: number): Promise<unknown>;
  query(filters: NostrFilter[], timeoutMs?: number): Promise<NostrEvent[]>;
  subscribe(
    filters: NostrFilter[],
    onEvent: (event: NostrEvent) => void
  ): () => void;
}

export function isNostrNetwork(network: any): network is NostrNetwork {
  return network?.isNostrNetwork === true;
}

export function getNostrNetwork(tooldb: ToolDb): NostrNetwork {
  const { network } = tooldb;
  if (!isNostrNetwork(network)) {
    throw new Error("This requires the Nostr network adapter");
  }
  return network;
}

/**
 * The key with the user namespace, if any (":pubkey.key")
 */
export function getFinalKey(
  tooldb: ToolDb,
  key: string,
  userNamespaced: boolean
): string {
  return userNamespaced ? `:${tooldb.userAccount.getAddress()}.${key}` : key;
}

/**
 * The owner of a user namespaced key, or undefined for shared keys
 */
export function getNamespaceOwner(finalKey: string): string | undefined {
  return finalKey.slice(0, 1) === ":"
    ? finalKey.split(".")[0].slice(1)
    : undefined;
}

/**
 * The `d` tag of a key, under the topic so apps sharing relays do not collide
 */
export function getKeyTag(tooldb: ToolDb, finalKey: string): string {
  return `${tooldb.options.topic}:${finalKey}`;
}

export function getValueFilters(
  tooldb: ToolDb,
  finalKey: string
): NostrFilter[] {
  const owner = getNamespaceOwner(finalKey);
  const filter: NostrFilter = {
    kinds: [VALUE_KIND],
    "#d": [getKeyTag(tooldb, finalKey)],
  };
  if (owner) filter.authors = [owner];
  return [filter];
}

/**
 * A value event as a record, the shape listeners and custom verificators get
 */
export function eventToRecord<T = any>(
  event: NostrEvent,
  finalKey: string
): VerificationData<T> {
  return {
    k: finalKey,
    a: event.pubkey,
    n: 0,
    t: event.created_at * 1000,
    h: event.id,
    s: event.sig,
    v: JSON.parse(event.content),
    c: null,
  };
}

export async function getStoredEvent(
  tooldb: ToolDb,
  finalKey: string
): Promise<NostrEvent | undefined> {
  try {
    const stored = JSON.parse(await tooldb.store.get(finalKey));
    return verifyEvent(stored) ? stored : undefined;
  } catch (e) {
    return undefined;
  }
}

/**
 * Verifies a value event for a key: signature, kind, key, timestamp,
 * namespace, value and custom verificators.
 */
export async function verifyValueEvent(
  tooldb: ToolDb,
  event: NostrEvent,
  finalKey: string
): Promise<VerifyResult> {
  if (!verifyEvent(event)) return VerifyResult.InvalidSignature;

  if (
    event.kind !== VALUE_KIND ||
    getTagValue(event, "d") !== getKeyTag(tooldb, finalKey)
  ) {
    return VerifyResult.InvalidData;
  }

  if (event.created_at > Date.now() / 1000 + MAX_CLOCK_SHIFT_SECONDS) {
    return VerifyResult.InvalidTimestamp;
  }

  const owner = getNamespaceOwner(finalKey);
  if (owner && owner !== event.pubkey) return VerifyResult.AddressMismatch;

  let record: VerificationData;
  try {
    record = eventToRecord(event, finalKey);
  } catch (e) {
    return VerifyResult.InvalidData;
  }

  return runCustomVerificators.call(tooldb, record, async () => {
    const stored = await getStoredEvent(tooldb, finalKey);
    return stored ? eventToRecord(stored, finalKey) : undefined;
  });
}

/**
 * The newest of the events (newest created_at, ties go to the lowest id)
 */
export function pickNewest(
  events: (NostrEvent | undefined)[]
): NostrEvent | undefined {
  return events.reduce<NostrEvent | undefined>(
    (newest, event) =>
      event && (!newest || isNewerEvent(event, newest)) ? event : newest,
    undefined
  );
}

/**
 * Stores the event if it is newer than the stored one, and notifies listeners
 * @returns whether it was stored
 */
export function storeIfNewer(
  tooldb: ToolDb,
  event: NostrEvent,
  finalKey: string
): Promise<boolean> {
  return tooldb.withKeyLock(finalKey, async () => {
    const stored = await getStoredEvent(tooldb, finalKey);
    if (stored && !isNewerEvent(event, stored)) return false;

    try {
      await tooldb.store.put(finalKey, JSON.stringify(event));
    } catch (e) {
      // do nothing
    }

    const record = eventToRecord(event, finalKey);
    tooldb.emit("data", record);
    tooldb.triggerKeyListener(finalKey, record);
    return true;
  });
}
