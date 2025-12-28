/**
 * Manages the user's ECDH encryption keys.
 *
 * The ECDH keys are stored encrypted on the P2P network (like signing keys).
 * This allows users to recover their keys from any device using their password.
 * The public key is also published separately so others can encrypt data for us.
 */

import { sha256 } from "tool-db";

import { generateECDHKeyPair, ECDHKeyPair } from "./groupCrypto";
import getToolDb from "./getToolDb";

// In-memory cache of the current user's keys
let currentKeys: ECDHKeyPair | null = null;

// Encrypted keys data structure (stored on network)
interface EncryptedECDHKeys {
  iv: string;
  data: string;
}

/**
 * Generate new ECDH keys for the current user.
 * Called during signup.
 */
export async function generateUserEncryptionKeys(): Promise<ECDHKeyPair> {
  const keys = await generateECDHKeyPair();
  currentKeys = keys;
  return keys;
}

/**
 * Encrypt ECDH keys with the user's password.
 */
async function encryptKeys(
  keys: ECDHKeyPair,
  password: string
): Promise<EncryptedECDHKeys> {
  const hashedPassword = sha256(password);

  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(hashedPassword),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode("tooldb-ecdh-salt-v2"),
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
 * Decrypt ECDH keys with the user's password.
 */
async function decryptKeys(
  encrypted: EncryptedECDHKeys,
  password: string
): Promise<ECDHKeyPair> {
  const hashedPassword = sha256(password);

  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(hashedPassword),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode("tooldb-ecdh-salt-v2"),
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
 * Store the ECDH keys encrypted on the network.
 * Also caches locally for faster access.
 */
export async function storeEncryptedKeys(
  keys: ECDHKeyPair,
  password: string
): Promise<void> {
  const toolDb = getToolDb();
  const encrypted = await encryptKeys(keys, password);

  // Store on the network (user-namespaced, so only we can write)
  await toolDb.putData<EncryptedECDHKeys>("ecdhKeys", encrypted, true);

  currentKeys = keys;
}

/**
 * Load and decrypt the ECDH keys.
 * First tries local cache, then fetches from network.
 * Called during login.
 */
export async function loadEncryptedKeys(
  password: string
): Promise<ECDHKeyPair | null> {
  const toolDb = getToolDb();
  // Fetch from network
  try {
    const encrypted = await toolDb.getData<EncryptedECDHKeys>("ecdhKeys", true);
    if (encrypted) {
      const keys = await decryptKeys(encrypted, password);
      currentKeys = keys;

      return keys;
    }
  } catch (error) {
    console.error("Failed to load ECDH keys from network:", error);
  }

  return null;
}

/**
 * Get the current user's ECDH keys (from memory cache)
 */
export function getCurrentKeys(): ECDHKeyPair | null {
  return currentKeys;
}

/**
 * Set the current keys (used after login)
 */
export function setCurrentKeys(keys: ECDHKeyPair): void {
  currentKeys = keys;
}

/**
 * Clear keys on logout
 */
export function clearKeys(): void {
  currentKeys = null;
}
