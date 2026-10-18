import {
  MapCrdt,
  ToolDb,
  createGroupKey,
  decryptForGroup,
  encryptForGroup,
  textRandom,
  unwrapGroupKey,
  wrapGroupKey,
} from "tool-db";

/**
 * Data model of the chat, all keys under the CHAT_TOPIC topic:
 *
 *   :<owner>.group-<id>            GroupData, only the owner can write it
 *   :<owner>.groupKey-<id>-<user>  the group key, wrapped for a member
 *   :<user>.messages-<id>          a member's encrypted messages
 *   :<user>.groups                 the groups a user joined or requested
 *   requests-<id>                  join requests, a CRDT map where users
 *                                  can only add themselves (see rules.js)
 */

export interface GroupData {
  id: string;
  name: string;
  owner: string;
  members: string[];
}

export interface StoredMessage {
  t: number;
  // Encrypted with the group key
  m: string;
}

export interface Message {
  author: string;
  t: number;
  text: string;
}

/**
 * Groups are shared as "<owner>/<id>"
 */
export const groupRef = (group: { owner: string; id: string }) =>
  `${group.owner}/${group.id}`;

export function parseGroupRef(ref: string) {
  const [owner, id] = ref.trim().split("/");
  if (!/^[0-9a-f]{64}$/.test(owner || "") || !id) {
    throw new Error("Invalid group link");
  }
  return { owner, id };
}

export const me = (db: ToolDb) => db.userAccount.getAddress() || "";

export const groupKey = (ref: { owner: string; id: string }) =>
  `:${ref.owner}.group-${ref.id}`;

export const messagesKey = (user: string, groupId: string) =>
  `:${user}.messages-${groupId}`;

export async function getMyGroups(db: ToolDb): Promise<string[]> {
  return (await db.getData<string[]>("groups", true)) || [];
}

async function addToMyGroups(db: ToolDb, ref: string) {
  const groups = await getMyGroups(db);
  if (!groups.includes(ref)) await db.putData("groups", [...groups, ref], true);
}

export async function createGroup(db: ToolDb, name: string) {
  const group: GroupData = {
    id: textRandom(12),
    name,
    owner: me(db),
    members: [me(db)],
  };

  // Our own copy of the group key, wrapped for ourselves
  const key = createGroupKey();
  await db.putData(
    `groupKey-${group.id}-${me(db)}`,
    await wrapGroupKey(db.userAccount, key, me(db)),
    true
  );
  await db.putData(`group-${group.id}`, group, true);
  await addToMyGroups(db, groupRef(group));
  return group;
}

export function getGroup(db: ToolDb, ref: string) {
  return db.getData<GroupData>(groupKey(parseGroupRef(ref)));
}

/**
 * Asks the owner to join a group
 */
export async function requestToJoin(db: ToolDb, ref: string) {
  const { id } = parseGroupRef(ref);
  const requests = new MapCrdt<string>(me(db));
  await db.getCrdt(`requests-${id}`, requests);
  requests.SET(me(db), db.userAccount.getUsername() || "");
  await db.putCrdt(`requests-${id}`, requests);
  await addToMyGroups(db, ref);
}

/**
 * Pending join requests of a group: { pubkey: name }
 */
export async function getJoinRequests(db: ToolDb, group: GroupData) {
  const requests = new MapCrdt<string>(me(db));
  await db.getCrdt(`requests-${group.id}`, requests);
  const pending: Record<string, string> = {};
  Object.entries(requests.value).forEach(([user, name]) => {
    if (!group.members.includes(user)) pending[user] = name;
  });
  return pending;
}

/**
 * Adds a member to our group, and shares the group key with them
 */
export async function acceptMember(db: ToolDb, group: GroupData, user: string) {
  const key = await getGroupKey(db, group);
  if (!key) throw new Error("Could not read the group key");

  await db.putData(
    `groupKey-${group.id}-${user}`,
    await wrapGroupKey(db.userAccount, key, user),
    true
  );
  const updated = { ...group, members: [...group.members, user] };
  await db.putData(`group-${group.id}`, updated, true);
  return updated;
}

const groupKeys: Record<string, string> = {};

/**
 * The group key, if the owner shared it with us
 */
export async function getGroupKey(db: ToolDb, group: GroupData) {
  if (groupKeys[group.id]) return groupKeys[group.id];

  const wrapped = await db.getData<string>(
    `:${group.owner}.groupKey-${group.id}-${me(db)}`
  );
  if (!wrapped) return undefined;

  groupKeys[group.id] = await unwrapGroupKey(
    db.userAccount,
    wrapped,
    group.owner
  );
  return groupKeys[group.id];
}

export async function sendMessage(db: ToolDb, group: GroupData, text: string) {
  const key = await getGroupKey(db, group);
  if (!key) throw new Error("You are not a member of this group yet");

  const mine =
    (await db.getData<StoredMessage[]>(`messages-${group.id}`, true)) || [];
  await db.putData(
    `messages-${group.id}`,
    [...mine, { t: Date.now(), m: encryptForGroup(key, text) }],
    true
  );
}

/**
 * Decrypts the messages of a member, skipping any we can not read
 */
export function decryptMessages(
  key: string,
  author: string,
  stored: StoredMessage[] | null
): Message[] {
  return (stored || []).flatMap((message) => {
    try {
      return [{ author, t: message.t, text: decryptForGroup(key, message.m) }];
    } catch (e) {
      return [];
    }
  });
}
