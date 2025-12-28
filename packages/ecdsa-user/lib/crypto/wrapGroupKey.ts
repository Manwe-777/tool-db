import {
  hexToArrayBuffer,
  arrayBufferToHex,
  uint8ToBase64,
} from "tool-db";

import getCrypto from "./getCrypto";
import generateIv from "./generateIv";
import importECDHPrivateKey from "./importECDHPrivateKey";
import importECDHPublicKey from "./importECDHPublicKey";
import deriveSharedKey from "./deriveSharedKey";

export interface WrappedGroupKey {
  iv: string; // base64 encoded
  key: string; // hex encoded encrypted group key
}

/**
 * Wrap (encrypt) a group key for a specific member using ECDH.
 *
 * This uses Elliptic Curve Diffie-Hellman to create a shared secret
 * between sender and recipient, then encrypts the group key with it.
 *
 * @param groupKey - The symmetric group key (hex string)
 * @param ourPrivateKeyHex - Our ECDH private key (hex string)
 * @param theirPublicKeyHex - Their ECDH public key (hex string)
 * @returns Wrapped key that only the recipient can unwrap
 */
export default async function wrapGroupKey(
  groupKey: string,
  ourPrivateKeyHex: string,
  theirPublicKeyHex: string
): Promise<WrappedGroupKey> {
  const crypto = getCrypto();

  const ourPrivateKey = await importECDHPrivateKey(ourPrivateKeyHex);
  const theirPublicKey = await importECDHPublicKey(theirPublicKeyHex);

  // Derive shared secret using ECDH
  const sharedKey = await deriveSharedKey(ourPrivateKey, theirPublicKey);

  // Encrypt the group key with the shared secret
  const iv = generateIv();
  const groupKeyData = new Uint8Array(hexToArrayBuffer(groupKey));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    sharedKey,
    groupKeyData
  );

  return {
    iv: uint8ToBase64(iv),
    key: arrayBufferToHex(encrypted),
  };
}

