import { ToolDb, NostrEvent, VerifyResult } from "..";

import {
  VALUE_KIND,
  eventToRecord,
  getFinalKey,
  getKeyTag,
  getNostrNetwork,
  getStoredEvent,
  getValueFilters,
  pickNewest,
  storeIfNewer,
  verifyValueEvent,
} from "./values";
import {
  CRDT_EVENT_KIND,
  getCrdtFilters,
  getStoredCrdt,
  onCrdtEvent,
  toNostrCrdtView,
} from "./crdts";

/**
 * Puts a value on a key, signed with our identity.
 * It is stored locally and published to the relays.
 * @param key key where we want to put the data at.
 * @param value Data we want to store (any JSON value)
 * @param userNamespaced If this key belongs to our user namespace, only we can write it.
 * @returns the signed event
 */
export async function nostrPutData<T = any>(
  this: ToolDb,
  key: string,
  value: T,
  userNamespaced = false
): Promise<NostrEvent> {
  if (key.includes(".")) {
    // Dots are used as a delimitator character between public keys and the key of the user's data
    throw new Error(`Key cannot include dots!; ${key}`);
  }

  if (!this.userAccount.getAddress()) {
    throw new Error("You need to log in before you can PUT.");
  }

  const finalKey = getFinalKey(this, key, userNamespaced);

  // Nostr timestamps are in seconds, and ties go to the lowest id. Make sure
  // our new value is newer than our previous one, even within the same second.
  let createdAt = Math.floor(Date.now() / 1000);
  const stored = await getStoredEvent(this, finalKey);
  if (stored && stored.pubkey === this.userAccount.getAddress()) {
    createdAt = Math.max(createdAt, stored.created_at + 1);
  }

  const event = await this.userAccount.signEvent({
    kind: VALUE_KIND,
    created_at: createdAt,
    tags: [
      ["d", getKeyTag(this, finalKey)],
      ["t", this.options.topic],
    ],
    content: JSON.stringify(value),
  });

  this.logger("PUT", finalKey, event);

  await storeIfNewer(this, event, finalKey);
  getNostrNetwork(this)
    .publish(event)
    .catch((e) => this.logger("Could not publish", e));

  return event;
}

/**
 * Gets the value of a key, from our local data and the relays.
 * @param key key of the data
 * @param userNamespaced If this key belongs to our user namespace.
 * @param timeoutMs Max time to wait for the relays.
 * @returns the newest valid value, or null
 */
export async function nostrGetData<T = any>(
  this: ToolDb,
  key: string,
  userNamespaced = false,
  timeoutMs = 1000
): Promise<T | null> {
  const finalKey = getFinalKey(this, key, userNamespaced);
  this.logger("GET", finalKey);

  const network = getNostrNetwork(this);
  const remote = this.isConnected
    ? await network.query(getValueFilters(this, finalKey), timeoutMs)
    : [];

  // Relays are not trusted, every event is verified
  const results = await Promise.all(
    remote.map((event) => verifyValueEvent(this, event, finalKey))
  );
  const valid = remote.filter(
    (_event, index) => results[index] === VerifyResult.Verified
  );

  const newest = pickNewest(valid);
  if (newest) await storeIfNewer(this, newest, finalKey);

  const winner = pickNewest([newest, await getStoredEvent(this, finalKey)]);
  return winner ? eventToRecord<T>(winner, finalKey).v : null;
}

/**
 * Subscribes to the updates of a key, triggering its key listeners with
 * every newer valid value.
 * @param key key of the data
 * @param userNamespaced If this key belongs to our user namespace.
 */
export async function nostrSubscribeData(
  this: ToolDb,
  key: string,
  userNamespaced = false
): Promise<void> {
  const finalKey = getFinalKey(this, key, userNamespaced);
  this.logger("SUBSCRIBE", finalKey);

  if (!this._nostrSubscriptions[finalKey]) {
    // A key can hold a value or a CRDT document, we listen for both
    this._nostrSubscriptions[finalKey] = getNostrNetwork(this).subscribe(
      [...getValueFilters(this, finalKey), ...getCrdtFilters(this, finalKey)],
      (event) => {
        if (event.kind === CRDT_EVENT_KIND) {
          onCrdtEvent(this, event, finalKey);
          return;
        }
        verifyValueEvent(this, event, finalKey).then((result) => {
          if (result === VerifyResult.Verified) {
            storeIfNewer(this, event, finalKey);
          }
        });
      }
    );
  }

  // Like before, listeners get our local data right away
  const stored = await getStoredEvent(this, finalKey);
  if (stored) {
    this.triggerKeyListener(finalKey, eventToRecord(stored, finalKey));
    return;
  }
  const storedCrdt = await getStoredCrdt(this, finalKey);
  if (storedCrdt) {
    this.triggerKeyListener(finalKey, toNostrCrdtView(storedCrdt) as any);
  }
}

/**
 * Stops receiving updates of a key
 */
export function nostrUnsubscribeData(
  this: ToolDb,
  key: string,
  userNamespaced = false
) {
  const finalKey = getFinalKey(this, key, userNamespaced);
  this._nostrSubscriptions[finalKey]?.();
  delete this._nostrSubscriptions[finalKey];
}
