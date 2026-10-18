import { ToolDb, NostrEvent, VerifyResult, getTagValue } from "..";

import { assertValidKey, getFinalKey, getKeyTag, parseKeyTag } from "./keys";
import {
  VALUE_KIND,
  eventToRecord,
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
  toCrdtView,
  verifyCrdtEvent,
} from "./crdts";

const finalKeyOf = (tooldb: ToolDb, key: string, userNamespaced: boolean) =>
  getFinalKey(tooldb.userAccount.getAddress() || "", key, userNamespaced);

/**
 * Puts a value on a key, signed with our identity.
 * It is stored locally and published to the relays.
 * @param key key where we want to put the data at.
 * @param value Data we want to store (any JSON value)
 * @param userNamespaced If this key belongs to our user namespace, only we can write it.
 * @returns the signed event
 */
export async function putData<T = any>(
  this: ToolDb,
  key: string,
  value: T,
  userNamespaced = false
): Promise<NostrEvent> {
  assertValidKey(key);

  if (!this.userAccount.getAddress()) {
    throw new Error("You need to log in before you can PUT.");
  }

  const finalKey = finalKeyOf(this, key, userNamespaced);

  // Nostr timestamps are in seconds, and ties go to the lowest id. Make sure
  // our new value is newer than our previous one, even within the same second.
  let createdAt = Math.floor(Date.now() / 1000);
  const stored = await getStoredEvent(this.store, finalKey);
  if (stored && stored.pubkey === this.userAccount.getAddress()) {
    createdAt = Math.max(createdAt, stored.created_at + 1);
  }

  const event = await this.userAccount.signEvent({
    kind: VALUE_KIND,
    created_at: createdAt,
    tags: [
      ["d", getKeyTag(this.options.topic, finalKey)],
      ["t", this.options.topic],
    ],
    content: JSON.stringify(value),
  });

  this.logger("PUT", finalKey, event);

  await storeIfNewer(this, event, finalKey);
  this.relays.publish(event).catch((e) => this.logger("Could not publish", e));

  return event;
}

/**
 * Gets the value of a key, from our local data and the relays.
 * @param key key of the data
 * @param userNamespaced If this key belongs to our user namespace.
 * @param timeoutMs Max time to wait for the relays.
 * @returns the newest valid value, or null
 */
export async function getData<T = any>(
  this: ToolDb,
  key: string,
  userNamespaced = false,
  timeoutMs = 1000
): Promise<T | null> {
  const finalKey = finalKeyOf(this, key, userNamespaced);
  this.logger("GET", finalKey);

  const remote = this.isConnected
    ? await this.relays.query(
        getValueFilters(this.options.topic, finalKey),
        timeoutMs
      )
    : [];

  // Relays are not trusted, every event is verified
  const results = await Promise.all(
    remote.map((event) => verifyValueEvent(this.verifyContext, event, finalKey))
  );
  const valid = remote.filter(
    (_event, index) => results[index] === VerifyResult.Verified
  );

  const newest = pickNewest(valid);
  if (newest) await storeIfNewer(this, newest, finalKey);

  const winner = pickNewest([
    newest,
    await getStoredEvent(this.store, finalKey),
  ]);
  return winner ? eventToRecord<T>(winner, finalKey).v : null;
}

/**
 * Subscribes to the updates of a key, triggering its key listeners with
 * every newer valid value, or CRDT change set.
 * @param key key of the data
 * @param userNamespaced If this key belongs to our user namespace.
 */
export async function subscribeData(
  this: ToolDb,
  key: string,
  userNamespaced = false
): Promise<void> {
  const finalKey = finalKeyOf(this, key, userNamespaced);
  const { topic } = this.options;
  this.logger("SUBSCRIBE", finalKey);

  if (!this._subscriptions[finalKey]) {
    // A key can hold a value or a CRDT document, we listen for both
    this._subscriptions[finalKey] = this.relays.subscribe(
      [...getValueFilters(topic, finalKey), ...getCrdtFilters(topic, finalKey)],
      (event) => {
        if (event.kind === CRDT_EVENT_KIND) {
          onCrdtEvent(this, event, finalKey);
          return;
        }
        verifyValueEvent(this.verifyContext, event, finalKey).then(
          (result) => {
            if (result === VerifyResult.Verified) {
              storeIfNewer(this, event, finalKey);
            }
          }
        );
      }
    );
  }

  // Listeners get our local data right away
  const stored = await getStoredEvent(this.store, finalKey);
  if (stored) {
    this.triggerKeyListener(finalKey, eventToRecord(stored, finalKey));
    return;
  }
  const storedCrdt = await getStoredCrdt(this.store, finalKey);
  if (storedCrdt) {
    this.triggerKeyListener(finalKey, toCrdtView(storedCrdt) as any);
  }
}

/**
 * Stops receiving updates of a key
 */
export function unsubscribeData(
  this: ToolDb,
  key: string,
  userNamespaced = false
) {
  const finalKey = finalKeyOf(this, key, userNamespaced);
  this._subscriptions[finalKey]?.();
  delete this._subscriptions[finalKey];
}

/**
 * Lists the keys starting with a prefix, from our local data and the relays.
 * Relays can not filter by prefix, so this asks for every key of the topic
 * and filters locally; fine for small topics.
 * @param prefix key prefix
 * @param userNamespaced If the keys belong to our user namespace.
 * @returns the keys, with their user namespace if any
 */
export async function queryKeys(
  this: ToolDb,
  prefix: string,
  userNamespaced = false,
  timeoutMs = 1000
): Promise<string[]> {
  const finalPrefix = finalKeyOf(this, prefix, userNamespaced);
  const { topic } = this.options;
  const keys = new Set<string>();

  try {
    (await this.store.query(finalPrefix)).forEach((key) => keys.add(key));
  } catch (e) {
    // do nothing
  }

  if (this.isConnected) {
    const author = userNamespaced ? this.userAccount.getAddress() : undefined;
    const events = await this.relays.query(
      [
        {
          kinds: [VALUE_KIND, CRDT_EVENT_KIND],
          "#t": [topic],
          ...(author ? { authors: [author] } : {}),
        },
      ],
      timeoutMs
    );

    await Promise.all(
      events.map(async (event) => {
        const isCrdt = event.kind === CRDT_EVENT_KIND;
        const finalKey = parseKeyTag(
          topic,
          getTagValue(event, isCrdt ? "k" : "d") || ""
        );
        if (finalKey === undefined || !finalKey.startsWith(finalPrefix)) {
          return;
        }

        const result = isCrdt
          ? await verifyCrdtEvent(
              this.verifyContext,
              event,
              finalKey,
              getTagValue(event, "c") || ""
            )
          : await verifyValueEvent(this.verifyContext, event, finalKey);
        if (result === VerifyResult.Verified) keys.add(finalKey);
      })
    );
  }

  return Array.from(keys).sort();
}
