import {
  ToolDb,
  ToolDbStorageAdapter,
  NostrEvent,
  NostrFilter,
  VerificationData,
  VerifyResult,
  getTagValue,
  isNewerEvent,
  verifyEvent,
} from "..";

import { getKeyTag, getNamespaceOwner } from "./keys";
import { VerifyContext, isInFuture, runCustomVerificators } from "./verify";

/**
 * Application data (NIP-78), an addressable event: relays keep the latest
 * event per author and key.
 */
export const VALUE_KIND = 30078;

export function getValueFilters(
  topic: string,
  finalKey: string
): NostrFilter[] {
  const owner = getNamespaceOwner(finalKey);
  const filter: NostrFilter = {
    kinds: [VALUE_KIND],
    "#d": [getKeyTag(topic, finalKey)],
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
    t: event.created_at * 1000,
    h: event.id,
    s: event.sig,
    v: JSON.parse(event.content),
    c: null,
  };
}

/**
 * Verifies a value event for a key: signature, kind, key, timestamp,
 * namespace, value and custom verificators.
 */
export async function verifyValueEvent(
  ctx: VerifyContext,
  event: NostrEvent,
  finalKey: string
): Promise<VerifyResult> {
  if (!verifyEvent(event)) return VerifyResult.InvalidSignature;

  if (
    event.kind !== VALUE_KIND ||
    getTagValue(event, "d") !== getKeyTag(ctx.topic, finalKey)
  ) {
    return VerifyResult.InvalidData;
  }

  if (isInFuture(event.created_at)) return VerifyResult.InvalidTimestamp;

  const owner = getNamespaceOwner(finalKey);
  if (owner && owner !== event.pubkey) return VerifyResult.AddressMismatch;

  let record: VerificationData;
  try {
    record = eventToRecord(event, finalKey);
  } catch (e) {
    return VerifyResult.InvalidData;
  }

  return runCustomVerificators(ctx, record);
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

export async function getStoredEvent(
  store: ToolDbStorageAdapter,
  finalKey: string
): Promise<NostrEvent | undefined> {
  try {
    const stored = JSON.parse(await store.get(finalKey));
    return verifyEvent(stored) ? stored : undefined;
  } catch (e) {
    return undefined;
  }
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
    const stored = await getStoredEvent(tooldb.store, finalKey);
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
