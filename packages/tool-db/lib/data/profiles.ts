import { ToolDb, NostrEvent, isNewerEvent, verifyEvent } from "..";

import { pickNewest } from "./values";
import { FetchLike, verifyNip05 } from "../nostr/nip05";

/**
 * User profiles are kind 0 events (NIP-01), shared with every Nostr app
 */
export const PROFILE_KIND = 0;

export interface Profile {
  name?: string;
  display_name?: string;
  about?: string;
  picture?: string;
  /**
   * NIP-05 identifier (name@domain), check it with verifyProfileName
   */
  nip05?: string;
  [field: string]: unknown;
}

// App keys can not contain dots, so this never collides with them
const profileKey = (pubkey: string) => `.profile/${pubkey}`;

function parseProfile(event: NostrEvent): Profile | undefined {
  try {
    const profile = JSON.parse(event.content);
    return typeof profile === "object" &&
      profile !== null &&
      !Array.isArray(profile)
      ? profile
      : undefined;
  } catch (e) {
    return undefined;
  }
}

function isValidProfileEvent(event: NostrEvent, pubkey: string) {
  return (
    verifyEvent(event) &&
    event.kind === PROFILE_KIND &&
    event.pubkey === pubkey &&
    parseProfile(event) !== undefined
  );
}

async function getStoredProfile(
  tooldb: ToolDb,
  pubkey: string
): Promise<NostrEvent | undefined> {
  try {
    const stored = JSON.parse(await tooldb.store.get(profileKey(pubkey)));
    return isValidProfileEvent(stored, pubkey) ? stored : undefined;
  } catch (e) {
    return undefined;
  }
}

function storeProfile(tooldb: ToolDb, event: NostrEvent) {
  return tooldb.withKeyLock(profileKey(event.pubkey), async () => {
    const stored = await getStoredProfile(tooldb, event.pubkey);
    if (stored && !isNewerEvent(event, stored)) return;
    await tooldb.store
      .put(profileKey(event.pubkey), JSON.stringify(event))
      .catch(() => undefined);
  });
}

/**
 * Publishes our profile, replacing the previous one
 * @returns the signed event
 */
export async function putProfile(
  this: ToolDb,
  profile: Profile
): Promise<NostrEvent> {
  const pubkey = this.userAccount.getAddress();
  if (!pubkey) throw new Error("You need to log in before you can PUT.");

  // Make sure it replaces our previous profile, even within the same second
  let createdAt = Math.floor(Date.now() / 1000);
  const stored = await getStoredProfile(this, pubkey);
  if (stored) createdAt = Math.max(createdAt, stored.created_at + 1);

  const event = await this.userAccount.signEvent({
    kind: PROFILE_KIND,
    created_at: createdAt,
    tags: [],
    content: JSON.stringify(profile),
  });

  await storeProfile(this, event);
  this.relays.publish(event).catch((e) => this.logger("Could not publish", e));
  return event;
}

/**
 * Gets the profile of a user, from our local data and the relays
 * @returns the newest valid profile, or null
 */
export async function getProfile(
  this: ToolDb,
  pubkey: string,
  timeoutMs = 1000
): Promise<Profile | null> {
  const remote = this.isConnected
    ? await this.relays.query(
        [{ kinds: [PROFILE_KIND], authors: [pubkey] }],
        timeoutMs
      )
    : [];

  const newest = pickNewest(
    remote.filter((event) => isValidProfileEvent(event, pubkey))
  );
  if (newest) await storeProfile(this, newest);

  const winner = pickNewest([newest, await getStoredProfile(this, pubkey)]);
  return winner ? parseProfile(winner) || null : null;
}

/**
 * Whether the NIP-05 name of a profile really belongs to its user
 */
export function verifyProfileName(
  profile: Profile,
  pubkey: string,
  fetchFn?: FetchLike
): Promise<boolean> {
  return typeof profile.nip05 === "string"
    ? verifyNip05(profile.nip05, pubkey, fetchFn)
    : Promise.resolve(false);
}
