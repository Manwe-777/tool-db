/**
 * Group Encryption Utilities for the Example Application
 *
 * This file provides app-specific group encryption features including:
 * - In-memory caching of decrypted group keys
 * - Persistence of encrypted group keys to the network
 * - Convenience functions for encrypting/decrypting group messages
 *
 * The underlying cryptographic primitives are imported from @tool-db/ecdsa-user
 * and tool-db packages.
 */

import { generateGroupKey } from "tool-db";

import {
  generateECDHKeyPair,
  ECDHKeyPair,
  wrapGroupKey,
  unwrapGroupKey,
  WrappedGroupKey,
  importAESKey,
  encryptWithKey,
  decryptWithKey,
  EncryptedData,
} from "@tool-db/ecdsa-user";

// Re-export types and functions from packages for convenience
export type { ECDHKeyPair, WrappedGroupKey, EncryptedData };
export { generateECDHKeyPair, generateGroupKey, wrapGroupKey, unwrapGroupKey };

// ============================================================================
// GROUP KEY CACHING (Application-specific)
// ============================================================================

// In-memory cache for decrypted group keys
const groupKeyCache = new Map<string, string>();

// Stored password hash for encrypting/decrypting group keys cache
let storedPasswordHash: string | null = null;

// Reference to toolDb instance (set during init)
let toolDbInstance: any = null;

// Encrypted group keys cache structure
interface EncryptedGroupKeysCache {
  iv: string;
  data: string;
}

/**
 * Encrypt group keys cache with password
 */
async function encryptGroupKeysCache(
  keys: Record<string, string>
): Promise<EncryptedGroupKeysCache> {
  if (!storedPasswordHash) throw new Error("Password hash not set");

  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(storedPasswordHash),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode("tooldb-groupkeys-salt-v1"),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    derivedKey,
    encoder.encode(JSON.stringify(keys))
  );

  return {
    iv: Array.from(iv)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join(""),
    data: Array.from(new Uint8Array(encrypted))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join(""),
  };
}

/**
 * Decrypt group keys cache with password
 */
async function decryptGroupKeysCache(
  encrypted: EncryptedGroupKeysCache
): Promise<Record<string, string>> {
  if (!storedPasswordHash) throw new Error("Password hash not set");

  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(storedPasswordHash),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode("tooldb-groupkeys-salt-v1"),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );

  const ivMatch = encrypted.iv.match(/.{2}/g) || [];
  const ivBytes = new Uint8Array(
    ivMatch.map((byte: string) => parseInt(byte, 16))
  );
  const dataMatch = encrypted.data.match(/.{2}/g) || [];
  const dataBytes = new Uint8Array(
    dataMatch.map((byte: string) => parseInt(byte, 16))
  );

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ivBytes },
    derivedKey,
    dataBytes
  );

  const decoder = new TextDecoder();
  return JSON.parse(decoder.decode(decrypted));
}

/**
 * Load group keys from network into memory cache
 */
async function loadGroupKeysFromNetwork(): Promise<void> {
  if (!toolDbInstance || !storedPasswordHash) return;

  try {
    const encrypted: EncryptedGroupKeysCache | null =
      await toolDbInstance.getData("groupKeysCache", true);
    if (encrypted && encrypted.iv && encrypted.data) {
      const keys = await decryptGroupKeysCache(encrypted);
      Object.entries(keys).forEach(([groupId, groupKey]) => {
        groupKeyCache.set(groupId, groupKey);
      });
      console.log(`Loaded ${Object.keys(keys).length} group keys from network`);
    }
  } catch (error) {
    console.warn("Failed to load group keys from network:", error);
  }
}

/**
 * Save group keys from memory cache to network
 */
async function saveGroupKeysToNetwork(): Promise<void> {
  if (!toolDbInstance || !storedPasswordHash) return;

  try {
    const keys: Record<string, string> = {};
    groupKeyCache.forEach((value, key) => {
      keys[key] = value;
    });

    const encrypted = await encryptGroupKeysCache(keys);
    await toolDbInstance.putData("groupKeysCache", encrypted, true);
  } catch (error) {
    console.error("Failed to save group keys to network:", error);
  }
}

/**
 * Initialize the group crypto module with toolDb instance and password
 * Called during login after ECDH keys are loaded
 */
export async function initGroupCrypto(
  toolDb: any,
  passwordHash: string
): Promise<void> {
  toolDbInstance = toolDb;
  storedPasswordHash = passwordHash;

  // Load cached group keys from network
  await loadGroupKeysFromNetwork();
}

/**
 * Store a decrypted group key in the cache (memory + network)
 */
export function cacheGroupKey(groupId: string, groupKey: string): void {
  groupKeyCache.set(groupId, groupKey);
  // Save to network asynchronously (don't block)
  saveGroupKeysToNetwork().catch((err) => {
    console.error("Failed to save group key to network:", err);
  });
}

/**
 * Get a cached group key
 */
export function getCachedGroupKey(groupId: string): string | undefined {
  return groupKeyCache.get(groupId);
}

/**
 * Clear all cached group keys (call on logout)
 */
export function clearGroupKeyCache(): void {
  groupKeyCache.clear();
  storedPasswordHash = null;
  toolDbInstance = null;
}

// ============================================================================
// MESSAGE ENCRYPTION (using group key)
// ============================================================================

export interface EncryptedMessage {
  iv: string; // base64 encoded IV
  ct: string; // hex encoded ciphertext
}

/**
 * Encrypt a message using the group's symmetric key.
 *
 * @param message - Plaintext message
 * @param groupKey - The group's symmetric key (hex string)
 * @returns Encrypted message as JSON string
 */
export async function encryptWithGroupKey(
  message: string,
  groupKey: string
): Promise<string> {
  const key = await importAESKey(groupKey);
  const encrypted = await encryptWithKey(message, key);

  return JSON.stringify(encrypted);
}

/**
 * Decrypt a message using the group's symmetric key.
 *
 * @param encryptedData - Encrypted message (JSON string from encryptWithGroupKey)
 * @param groupKey - The group's symmetric key (hex string)
 * @returns Decrypted plaintext message
 */
export async function decryptWithGroupKey(
  encryptedData: string,
  groupKey: string
): Promise<string> {
  const encrypted: EncryptedData = JSON.parse(encryptedData);
  const key = await importAESKey(groupKey);
  return decryptWithKey(encrypted, key);
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Encrypt a message for a group (using cached group key)
 * Falls back to no encryption if group key not available
 */
export async function encryptGroupMessage(
  message: string,
  groupId: string
): Promise<string> {
  const groupKey = getCachedGroupKey(groupId);
  if (!groupKey) {
    console.warn(`No group key found for ${groupId}, sending unencrypted`);
    return message;
  }
  return encryptWithGroupKey(message, groupKey);
}

/**
 * Decrypt a message from a group (using cached group key)
 */
export async function decryptGroupMessage(
  encryptedData: string,
  groupId: string
): Promise<string> {
  const groupKey = getCachedGroupKey(groupId);
  if (!groupKey) {
    throw new Error(`No group key found for ${groupId}`);
  }
  return decryptWithGroupKey(encryptedData, groupKey);
}

/**
 * Check if a message string is encrypted (application-specific format check)
 */
export function isEncryptedMessage(message: string): boolean {
  try {
    const parsed = JSON.parse(message);
    return typeof parsed.iv === "string" && typeof parsed.ct === "string";
  } catch {
    return false;
  }
}

/**
 * Wrap group key for a member using ECDH (re-exported for convenience)
 * This is an alias for wrapGroupKey with a more descriptive name
 */
export async function wrapGroupKeyForMember(
  groupKey: string,
  ourPrivateKeyHex: string,
  theirPublicKeyHex: string
): Promise<WrappedGroupKey> {
  return wrapGroupKey(groupKey, ourPrivateKeyHex, theirPublicKeyHex);
}
