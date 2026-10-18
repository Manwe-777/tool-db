import {
  ToolDbUserAdapter,
  generateSecretKey,
  getConversationKey,
  getPublicKey,
  nip44Decrypt,
  nip44Encrypt,
} from "..";

/**
 * Group encryption: a group key is a Nostr secret key shared by the members
 * of a group. It is wrapped for each member with NIP-44, and group messages
 * are encrypted with the group key itself, so any member can decrypt them.
 */

/**
 * Creates a new random group key (hex)
 */
export function createGroupKey(): string {
  return generateSecretKey();
}

/**
 * Encrypts the group key for a member, with our identity
 */
export function wrapGroupKey(
  user: ToolDbUserAdapter,
  groupKey: string,
  memberPublicKey: string
): Promise<string> {
  return user.nip44Encrypt(memberPublicKey, groupKey);
}

/**
 * Decrypts a group key wrapped for us
 * @param wrapperPublicKey who wrapped the key for us
 */
export async function unwrapGroupKey(
  user: ToolDbUserAdapter,
  wrapped: string,
  wrapperPublicKey: string
): Promise<string> {
  const groupKey = await user.nip44Decrypt(wrapperPublicKey, wrapped);
  if (!/^[0-9a-f]{64}$/.test(groupKey)) throw new Error("Invalid group key");
  return groupKey;
}

const groupConversationKey = (groupKey: string) =>
  getConversationKey(groupKey, getPublicKey(groupKey));

/**
 * Encrypts a message for every member of the group
 */
export function encryptForGroup(groupKey: string, plaintext: string): string {
  return nip44Encrypt(plaintext, groupConversationKey(groupKey));
}

/**
 * Decrypts a message of the group
 */
export function decryptForGroup(groupKey: string, payload: string): string {
  return nip44Decrypt(payload, groupConversationKey(groupKey));
}
