/**
 * The key with the user namespace, if any (":pubkey.key")
 */
export function getFinalKey(
  address: string,
  key: string,
  userNamespaced: boolean
): string {
  return userNamespaced ? `:${address}.${key}` : key;
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
 * The tag of a key in events, under the topic so apps sharing relays do not
 * collide
 */
export function getKeyTag(topic: string, finalKey: string): string {
  return `${topic}:${finalKey}`;
}

/**
 * The key of a key tag, or undefined if the tag is not of this topic
 */
export function parseKeyTag(topic: string, tag: string): string | undefined {
  return tag.startsWith(`${topic}:`) ? tag.slice(topic.length + 1) : undefined;
}

export function assertValidKey(key: string) {
  if (key.includes(".")) {
    // Dots are used as a delimitator character between public keys and the key of the user's data
    throw new Error(`Key cannot include dots!; ${key}`);
  }
}
