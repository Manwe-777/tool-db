import {
  hexToArrayBuffer,
  arrayBufferToHex,
  base64ToUint8,
} from "tool-db";

import getCrypto from "./getCrypto";
import importECDHPrivateKey from "./importECDHPrivateKey";
import importECDHPublicKey from "./importECDHPublicKey";
import deriveSharedKey from "./deriveSharedKey";

import { WrappedGroupKey } from "./wrapGroupKey";

/**
 * Unwrap (decrypt) a group key that was encrypted for us.
 *
 * This uses ECDH to recreate the shared secret used for encryption,
 * then decrypts the group key.
 *
 * @param wrappedKey - The wrapped key object
 * @param ourPrivateKeyHex - Our ECDH private key (hex string)
 * @param senderPublicKeyHex - Sender's ECDH public key (hex string)
 * @returns The decrypted group key (hex string)
 */
export default async function unwrapGroupKey(
  wrappedKey: WrappedGroupKey,
  ourPrivateKeyHex: string,
  senderPublicKeyHex: string
): Promise<string> {
  const crypto = getCrypto();

  const ourPrivateKey = await importECDHPrivateKey(ourPrivateKeyHex);
  const senderPublicKey = await importECDHPublicKey(senderPublicKeyHex);

  // Derive the same shared secret
  const sharedKey = await deriveSharedKey(ourPrivateKey, senderPublicKey);

  // Decrypt the group key
  const iv = base64ToUint8(wrappedKey.iv);
  const wrappedKeyData = new Uint8Array(hexToArrayBuffer(wrappedKey.key));
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    sharedKey,
    wrappedKeyData
  );

  return arrayBufferToHex(decrypted);
}

