/**
 * Secure Group Encryption using ECDH + AES-GCM
 *
 * This implements proper end-to-end encryption where:
 * 1. Each user has an ECDH key pair for encryption (separate from signing keys)
 * 2. Each group has a random symmetric key
 * 3. The group key is encrypted for each member using ECDH key derivation
 * 4. Only members with the correct private key can decrypt the group key
 * 5. Messages are encrypted with the group key (fast symmetric encryption)
 *
 * Security: Even if an attacker sees all public data (group IDs, encrypted keys,
 * encrypted messages), they cannot decrypt without a member's private key.
 */

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function stringToArrayBuffer(str: string): ArrayBuffer {
  const encoder = new TextEncoder();
  return encoder.encode(str).buffer;
}

function arrayBufferToString(buffer: ArrayBuffer): string {
  const decoder = new TextDecoder();
  return decoder.decode(buffer);
}

function arrayBufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToArrayBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes.buffer;
}

function uint8ToBase64(uint8: Uint8Array): string {
  return btoa(String.fromCharCode(...Array.from(uint8.values())));
}

function base64ToUint8(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function generateIv(): Uint8Array {
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  return iv;
}

// ============================================================================
// ECDH KEY MANAGEMENT
// ============================================================================

export interface ECDHKeyPair {
  publicKey: string; // hex-encoded SPKI format
  privateKey: string; // hex-encoded PKCS8 format
}

/**
 * Generate an ECDH key pair for encryption purposes.
 * This should be called once during signup and stored securely.
 */
export async function generateECDHKeyPair(): Promise<ECDHKeyPair> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "ECDH",
      namedCurve: "P-256",
    },
    true, // extractable
    ["deriveKey", "deriveBits"]
  );

  const publicKeyBuffer = await crypto.subtle.exportKey(
    "spki",
    keyPair.publicKey
  );
  const privateKeyBuffer = await crypto.subtle.exportKey(
    "pkcs8",
    keyPair.privateKey
  );

  return {
    publicKey: arrayBufferToHex(publicKeyBuffer),
    privateKey: arrayBufferToHex(privateKeyBuffer),
  };
}

/**
 * Import a public key from hex format for ECDH operations
 */
async function importECDHPublicKey(hexKey: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "spki",
    hexToArrayBuffer(hexKey),
    { name: "ECDH", namedCurve: "P-256" },
    true,
    []
  );
}

/**
 * Import a private key from hex format for ECDH operations
 */
async function importECDHPrivateKey(hexKey: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "pkcs8",
    hexToArrayBuffer(hexKey),
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey", "deriveBits"]
  );
}

/**
 * Derive a shared AES key from our private key and their public key using ECDH
 */
async function deriveSharedKey(
  ourPrivateKey: CryptoKey,
  theirPublicKey: CryptoKey
): Promise<CryptoKey> {
  return crypto.subtle.deriveKey(
    {
      name: "ECDH",
      public: theirPublicKey,
    },
    ourPrivateKey,
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["encrypt", "decrypt"]
  );
}

// ============================================================================
// GROUP KEY MANAGEMENT
// ============================================================================

/**
 * Generate a random 256-bit group key
 */
export function generateGroupKey(): string {
  const key = crypto.getRandomValues(new Uint8Array(32));
  return arrayBufferToHex(key.buffer);
}

export interface WrappedGroupKey {
  iv: string; // base64 encoded
  key: string; // hex encoded encrypted group key
}

/**
 * Wrap (encrypt) a group key for a specific member using ECDH.
 *
 * @param groupKey - The symmetric group key (hex string)
 * @param ourPrivateKeyHex - Our ECDH private key (hex string)
 * @param theirPublicKeyHex - Their ECDH public key (hex string)
 * @returns Wrapped key that only the recipient can unwrap
 */
export async function wrapGroupKeyForMember(
  groupKey: string,
  ourPrivateKeyHex: string,
  theirPublicKeyHex: string
): Promise<WrappedGroupKey> {
  const ourPrivateKey = await importECDHPrivateKey(ourPrivateKeyHex);
  const theirPublicKey = await importECDHPublicKey(theirPublicKeyHex);

  // Derive shared secret using ECDH
  const sharedKey = await deriveSharedKey(ourPrivateKey, theirPublicKey);

  // Encrypt the group key with the shared secret
  const iv = generateIv();
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as any },
    sharedKey,
    hexToArrayBuffer(groupKey)
  );

  return {
    iv: uint8ToBase64(iv),
    key: arrayBufferToHex(encrypted),
  };
}

/**
 * Unwrap (decrypt) a group key that was encrypted for us.
 *
 * @param wrappedKey - The wrapped key object
 * @param ourPrivateKeyHex - Our ECDH private key (hex string)
 * @param senderPublicKeyHex - Sender's ECDH public key (hex string)
 * @returns The decrypted group key (hex string)
 */
export async function unwrapGroupKey(
  wrappedKey: WrappedGroupKey,
  ourPrivateKeyHex: string,
  senderPublicKeyHex: string
): Promise<string> {
  const ourPrivateKey = await importECDHPrivateKey(ourPrivateKeyHex);
  const senderPublicKey = await importECDHPublicKey(senderPublicKeyHex);

  // Derive the same shared secret
  const sharedKey = await deriveSharedKey(ourPrivateKey, senderPublicKey);

  // Decrypt the group key
  const iv = base64ToUint8(wrappedKey.iv);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as any },
    sharedKey,
    hexToArrayBuffer(wrappedKey.key)
  );

  return arrayBufferToHex(decrypted);
}

// ============================================================================
// MESSAGE ENCRYPTION (using group key)
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

/**
 * Import a raw group key for encryption/decryption
 */
async function importGroupKey(hexKey: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    hexToArrayBuffer(hexKey),
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

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
  const key = await importGroupKey(groupKey);
  const iv = generateIv();

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as any },
    key,
    stringToArrayBuffer(message)
  );

  const encrypted: EncryptedMessage = {
    iv: uint8ToBase64(iv),
    ct: arrayBufferToHex(ciphertext),
  };

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
  const encrypted: EncryptedMessage = JSON.parse(encryptedData);
  const key = await importGroupKey(groupKey);
  const iv = base64ToUint8(encrypted.iv);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as any },
    key,
    hexToArrayBuffer(encrypted.ct)
  );

  return arrayBufferToString(decrypted);
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
 * Check if a message string is encrypted
 */
export function isEncryptedMessage(message: string): boolean {
  try {
    const parsed = JSON.parse(message);
    return typeof parsed.iv === "string" && typeof parsed.ct === "string";
  } catch {
    return false;
  }
}
