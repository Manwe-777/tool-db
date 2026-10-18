// Shared by the app and the dev relay (relay.mjs), so both apply the same
// rules.

/** The ToolDB topic of the chat, apps sharing relays only see their own */
export const CHAT_TOPIC = "tool-db-chat";

/**
 * Join requests are a shared CRDT map (requests-<groupId>), where each user
 * adds themselves: every change must be for the key of its author, so
 * nobody can add or remove requests of someone else.
 * @param {{ a: string, v: { k: string }[] }} msg
 */
export async function onlyOwnJoinRequests(msg) {
  return Array.isArray(msg.v) && msg.v.every((change) => change.k === msg.a);
}
